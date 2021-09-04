import { ipcRenderer } from "electron";
import ical from "ical";
import moment from "moment";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// configurable variables
let notifyBeforeMin = 2.0;
let intervalMin = 15.0;

const notificationTimers: any[] = [];
let storedNextEvents: any[] = [];

const fetchConfigJson = () => {
  const fileBody = fs.readFileSync(
    path.join(__dirname, "../config.Json"),
    "utf8"
  );
  return JSON.parse(fileBody);
};

const parseEvents = (data: any) => {
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
const flattenEvents = (nestedEvents: any[]) => {
  return nestedEvents
    .map((ev: any) => {
      const evs = [];

      if (ev.rrule) {
        const todayRules = ev.rrule.all().filter((time: any) => {
          return isTodayEvent(time);
        });
        const todayEvents = todayRules.map((time: any) => {
          return { summary: ev.summary, start: time };
        });
        evs.push(todayEvents);
      }

      if (ev.recurrences) {
        const todayEvents = ev.recurrences.filter((ev: any) => {
          isTodayEvent(ev.start);
        });
        evs.push(todayEvents);
      }

      evs.push(ev);
      return evs;
    })
    .flat(Infinity);
};

const isTodayEvent = (startTime: any) => {
  const isCurrentDate = moment(startTime).isSame(new Date(), "day");
  return isCurrentDate;
};

const isNextEvent = (startTime: any) => {
  const now = moment();
  const minutes = minutesBetween(now, startTime);
  return minutes > 0;
};

const minutesBetween = (since: any, until: any) => {
  const duration = moment.duration(moment(until).diff(since));
  return duration.asMinutes();
};

const setTimersAfterClear = (events: any[]) => {
  clearTimers(notificationTimers);

  if (events.length === 0) return;

  const now = moment();
  events.forEach((ev: any) => {
    const minutes = minutesBetween(now, ev.start);
    const minutesFromNow = (minutes - notifyBeforeMin) * 60 * 1000;
    const title = ev.summary;
    const startTime = ev.start;

    notificationTimers.push(
      setTimeout(displaySchedule, minutesFromNow, title, startTime)
    );
  });
};

const clearTimers = (targetTimers: any[]) => {
  if (targetTimers.length === 0) return;

  targetTimers.forEach((timer: any) => {
    clearTimeout(timer);
  });
};

const displaySchedule = (title: any, startTime: any) => {
  const titleDiv = document.getElementsByClassName("child")[0];
  const scheduleDiv = document.getElementsByClassName("schedule")[0];

  if (titleDiv) {
    (<HTMLElement>titleDiv).innerText = title;
  }

  if (scheduleDiv) {
    (<HTMLElement>scheduleDiv).innerText = moment(startTime).format("HH:mm");
  }

  ipcRenderer.send("sendSchedule");
};

/* eslint-disable no-unused-vars */
const buttonClick = () => {
  console.log("buttonClick");
  ipcRenderer.send("hideWindow");
};

const showPopup = () => {
  ipcRenderer.send("showPopup");
};

const hidePopup = () => {
  ipcRenderer.send("hidePopup");
};
/* eslint-enable no-unused-vars */

const setConfiguration = (configJson: any) => {
  const maybeNotifyBeforeMin = configJson["notificationMinutes"];
  const maybeFetchInterval = configJson["fetchInterval"];

  if (!isNaN(maybeNotifyBeforeMin)) {
    notifyBeforeMin = parseFloat(maybeNotifyBeforeMin);
  }

  if (!isNaN(maybeFetchInterval)) {
    intervalMin = parseFloat(maybeFetchInterval);
  }
};

async function fetchEventsData(configJson: any) {
  const response = await axios.get(configJson["url"]);
  const data = ical.parseICS(response["data"]);
  return parseEvents(data);
}

const buildEventsListElement = (events: any[]) => {
  return sortEvents(events)
    .map((ev: any) => {
      const time = moment(ev.start).format("HH:mm");
      const title = ev.summary;
      return `${time} _ ${title}\n`;
    })
    .join("");
};

const attachNextEvents = (nextEvents: any[]) => {
  const targetDiv = document.getElementsByClassName("child-small")[0];

  if (targetDiv) {
    const text =
      nextEvents.length > 0
        ? buildEventsListElement(nextEvents)
        : "All Schedule Finished";
    (<HTMLElement>targetDiv).innerText = text;
  }
};

const storeNextEvents = (events: any[]) => {
  storedNextEvents = events;
};

const fetchNextEvents = () => {
  return storedNextEvents;
};

const findNextEvent = (nextEvents: any[]) => {
  return sortEvents(nextEvents)[0];
};

const sortEvents = (events: any[]) => {
  return events.sort(minutesBetween).reverse();
};

const filterTodayEvents = (events: any[]) => {
  return events.filter((ev: any) => isTodayEvent(ev.start));
};

const filterNextEvents = (events: any[]) => {
  return events.filter((ev: any) => isNextEvent(ev.start));
};

const registerIpcReceive = () => {
  ipcRenderer.on("fromMain", () => {
    const nextEvents = fetchNextEvents();
    attachNextEvents(nextEvents);
  });
};

async function main(configJson: any) {
  const eventsData = await fetchEventsData(configJson);
  const flattenEventsData = flattenEvents(eventsData);
  const todayEvents = filterTodayEvents(flattenEventsData);
  const nextEvents = filterNextEvents(todayEvents);
  storeNextEvents(nextEvents);

  const nextEvent = findNextEvent(nextEvents);
  if (nextEvent) {
    displaySchedule(nextEvent.summary, nextEvent.start);
  } else {
    displaySchedule("All Schedule Finished", moment());
  }

  setTimersAfterClear(nextEvents);
}

async function beforeStart(configJson: any) {
  registerIpcReceive();
  registerButtonEvents();
  setConfiguration(configJson);
}

const registerButtonEvents = () => {
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

async function start() {
  const configJson = fetchConfigJson();
  await beforeStart(configJson);

  console.log(
    `fetchInterval: ${intervalMin}, notifyBeforeMin: ${notifyBeforeMin}`
  );

  main(configJson);
  setInterval(main, intervalMin * 60 * 1000);
}

start();
