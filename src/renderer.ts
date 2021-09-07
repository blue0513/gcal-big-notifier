import { ipcRenderer } from "electron";
import ical from "ical";
import moment from "moment";
import axios from "axios";
import schedule from "node-schedule";
import * as fs from "fs";
import * as path from "path";
import type { CalendarComponent, FullCalendar } from "ical";
import type { Job } from "node-schedule";

interface ConfigJson {
  url: string;
  fetchInterval?: number;
  notificationMinutes?: number;
}

// configurable variables
let notifyBeforeMin = 2.0;
let intervalMin = 15.0;

const notificationJobs: Job[] = [];
let storedNextEvents: CalendarComponent[] = [];

const fetchConfigJson = (): ConfigJson => {
  const fileBody = fs.readFileSync(
    path.join(__dirname, "../config.Json"),
    "utf8"
  );
  return JSON.parse(fileBody);
};

const parseEvents = (data: FullCalendar): CalendarComponent[] => {
  const events = [];

  for (const k in data) {
    if (data && Object.prototype.hasOwnProperty.call(data, k)) {
      const ev = data[k];
      if (ev.type == "VEVENT") {
        events.push(ev);
      }
    }
  }

  return events;
};

// TODO: should Unit Test
const flattenEvents = (
  nestedEvents: CalendarComponent[]
): CalendarComponent[] => {
  return nestedEvents
    .map((ev: CalendarComponent) => {
      const evs: any[] = [];

      if (ev.rrule) {
        const todayRules: Date[] = ev.rrule.all().filter((time: Date) => {
          return isTodayEvent(time);
        });
        const todayEvents = todayRules.map((time: Date) => {
          return { type: "VEVENT", summary: ev.summary, start: time };
        });
        evs.push(todayEvents);
      }

      if (ev.recurrences) {
        const todayEvents = ev.recurrences.filter((ev: CalendarComponent) => {
          isTodayEvent(moment(ev.start).toDate());
        });
        evs.push(todayEvents);
      }

      evs.push(ev);
      return evs;
    })
    .flat(Infinity);
};

const isTodayEvent = (startTime: Date): boolean => {
  const isCurrentDate = moment(startTime).isSame(new Date(), "day");
  return isCurrentDate;
};

const isNextEvent = (startTime: Date): boolean => {
  const now = new Date();
  const minutes = minutesBetween(now, startTime);
  return minutes > 0;
};

const minutesBetween = (since: Date, until: Date): number => {
  const duration = moment.duration(moment(until).diff(since));
  return duration.asMinutes();
};

const setTimerJobsAfterClear = (events: CalendarComponent[]): void => {
  clearTimerJobs(notificationJobs);

  if (events.length === 0) return;

  events.forEach((ev: CalendarComponent) => {
    const startTime = moment(ev.start);
    const targetTime = startTime.add(-1 * notifyBeforeMin, "minutes").toDate();
    const title = ev.summary || "No Title";
    const job = schedule.scheduleJob(targetTime, () => {
      setScheduleText(title, startTime.toDate());
      showWindow();
    });
    notificationJobs.push(job);
  });
};

const clearTimerJobs = (targetTimerJobs: Job[]): void => {
  if (targetTimerJobs.length === 0) return;

  targetTimerJobs.forEach((job: Job) => {
    job.cancel();
  });
};

const setScheduleText = (title: string, startTime: Date): void => {
  const titleDiv = document.getElementsByClassName("child")[0];
  const scheduleDiv = document.getElementsByClassName("schedule")[0];

  if (titleDiv) {
    (<HTMLElement>titleDiv).innerText = title;
  }

  if (scheduleDiv) {
    (<HTMLElement>scheduleDiv).innerText = moment(startTime).format("HH:mm");
  }
};

const showWindow = (): void => {
  ipcRenderer.send("sendSchedule");
};

/* eslint-disable no-unused-vars */
const buttonClick = (): void => {
  ipcRenderer.send("hideWindow");
};

const showPopup = (): void => {
  ipcRenderer.send("showPopup");
};

const hidePopup = (): void => {
  ipcRenderer.send("hidePopup");
};
/* eslint-enable no-unused-vars */

const setConfiguration = (configJson: ConfigJson): void => {
  const maybeNotifyBeforeMin = configJson["notificationMinutes"];
  const maybeFetchInterval = configJson["fetchInterval"];

  if (maybeNotifyBeforeMin) {
    notifyBeforeMin = maybeNotifyBeforeMin;
  }

  if (maybeFetchInterval) {
    intervalMin = maybeFetchInterval;
  }
};

async function fetchEventsData(
  configJson: ConfigJson
): Promise<CalendarComponent[]> {
  const response = await axios.get(configJson["url"]);
  const data: FullCalendar = ical.parseICS(response["data"]);
  return parseEvents(data);
}

const buildEventsListElement = (events: CalendarComponent[]): string => {
  return sortEvents(events)
    .map((ev: CalendarComponent) => {
      const time = moment(ev.start).format("HH:mm");
      const title = ev.summary;
      return `${time} _ ${title}\n`;
    })
    .join("");
};

const attachNextEvents = (nextEvents: CalendarComponent[]): void => {
  const targetDiv = document.getElementsByClassName("child-small")[0];

  if (targetDiv) {
    const text =
      nextEvents.length > 0
        ? buildEventsListElement(nextEvents)
        : "All Schedule Finished";
    (<HTMLElement>targetDiv).innerText = text;
  }
};

const storeNextEvents = (events: CalendarComponent[]): void => {
  storedNextEvents = events;
};

const fetchNextEvents = (): CalendarComponent[] => {
  return storedNextEvents;
};

const findNextEvent = (nextEvents: CalendarComponent[]): CalendarComponent => {
  return sortEvents(nextEvents)[0];
};

const sortEvents = (events: CalendarComponent[]): CalendarComponent[] => {
  return events
    .sort((a, b) => {
      if (a.start && b.start) {
        return minutesBetween(a.start, b.start);
      } else if (!a.start) {
        return 1;
      } else {
        return -1;
      }
    })
    .reverse();
};

const filterTodayEvents = (
  events: CalendarComponent[]
): CalendarComponent[] => {
  return events.filter((ev: CalendarComponent) =>
    isTodayEvent(moment(ev.start).toDate())
  );
};

const filterNextEvents = (events: CalendarComponent[]): CalendarComponent[] => {
  return events.filter((ev: CalendarComponent) =>
    isNextEvent(moment(ev.start).toDate())
  );
};

const registerIpcReceive = (): void => {
  ipcRenderer.on("fromMain", () => {
    const nextEvents = fetchNextEvents();
    attachNextEvents(nextEvents);
  });
};

async function main(configJson: ConfigJson): Promise<void> {
  const eventsData = await fetchEventsData(configJson);
  const flattenEventsData = flattenEvents(eventsData);
  const todayEvents = filterTodayEvents(flattenEventsData);
  const nextEvents = filterNextEvents(todayEvents);
  storeNextEvents(nextEvents);

  const nextEvent = findNextEvent(nextEvents);
  if (nextEvent) {
    const title = nextEvent.summary ? nextEvent.summary : "no title";
    setScheduleText(title, moment(nextEvent.start).toDate());
  } else {
    setScheduleText("All Schedule Finished", moment().toDate());
  }

  setTimerJobsAfterClear(nextEvents);
}

async function beforeStart(configJson: ConfigJson): Promise<void> {
  registerIpcReceive();
  registerButtonEvents();
  setConfiguration(configJson);
}

const registerButtonEvents = (): void => {
  const closeButton = document.getElementById("hide-button");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      buttonClick();
    });
  }

  const popupButton = document.getElementById("show-popup-button");
  if (popupButton) {
    popupButton.addEventListener("click", () => {
      showPopup();
    });
  }

  const hidePopupButton = document.getElementById("hide-popup-button");
  if (hidePopupButton) {
    hidePopupButton.addEventListener("click", () => {
      hidePopup();
    });
  }
};

async function start(): Promise<void> {
  const configJson = fetchConfigJson();
  await beforeStart(configJson);

  console.log(
    `fetchInterval: ${intervalMin}, notifyBeforeMin: ${notifyBeforeMin}`
  );

  main(configJson);
  setInterval(main, intervalMin * 60 * 1000, configJson);
}

start();
