const { ipcRenderer } = require("electron");
const ical = require("ical");
const moment = require("moment");
const axios = require("axios");
const fs = require("fs").promises;

const notifyBeforeMin = 2.0;
const intervalMin = 15.0;

let notificationTimers = [];
let storedNextEvents = [];

async function fetchCalendarJson() {
  const fileBody = await fs.readFile("./secret.json", "utf-8");
  return JSON.parse(fileBody);
}

const parseEvents = (data) => {
  let events = [];

  for (let k in data) {
    if (data && Object.prototype.hasOwnProperty.call(data, k)) {
      let ev = data[k];
      if (ev.type == "VEVENT") {
        events.push(ev);
      }
    }
  }

  return events;
};

// TODO: should Unit Test
const flattenEvents = (nestedEvents) => {
  return nestedEvents
    .map((ev) => {
      let evs = [];

      if (ev.rrule) {
        const todayRules = ev.rrule.all().filter((time) => {
          return isTodayEvent(time);
        });
        const todayEvents = todayRules.map((time) => {
          return { summary: ev.summary, start: time };
        });
        evs.push(todayEvents);
      }

      if (ev.recurrences) {
        const todayEvents = ev.recurrences.filter((ev) => {
          isTodayEvent(ev.start);
        });
        evs.push(todayEvents);
      }

      evs.push(ev);
      return evs;
    })
    .flat(Infinity);
};

const isTodayEvent = (startTime) => {
  const isCurrentDate = moment(startTime).isSame(new Date(), "day");
  return isCurrentDate;
};

const isNextEvent = (startTime) => {
  const now = moment();
  const minutes = minutesBetween(now, startTime);
  return minutes > 0;
};

const minutesBetween = (since, until) => {
  const duration = moment.duration(moment(until).diff(since));
  return duration.asMinutes();
};

const setTimersAfterClear = (events) => {
  clearTimers(notificationTimers);

  if (events.length === 0) return;

  const now = moment();
  events.forEach((ev) => {
    let minutes = minutesBetween(now, ev.start);
    let minutesFromNow = (minutes - notifyBeforeMin) * 60 * 1000;
    let title = ev.summary;
    let startTime = ev.start;

    notificationTimers.push(
      setTimeout(displaySchedule, minutesFromNow, title, startTime)
    );
  });
};

const clearTimers = (targetTimers) => {
  if (targetTimers.length === 0) return;

  targetTimers.forEach((timer) => {
    clearTimeout(timer);
  });
};

const displaySchedule = (title, startTime) => {
  const titleDiv = document.getElementsByClassName("child")[0];
  const scheduleDiv = document.getElementsByClassName("schedule")[0];

  titleDiv.innerText = title;
  scheduleDiv.innerText = moment(startTime).format("HH:mm");

  ipcRenderer.send("sendSchedule");
};

/* eslint-disable no-unused-vars */
const buttonClick = () => {
  ipcRenderer.send("hideWindow");
};

const showPopup = () => {
  ipcRenderer.send("showPopup");
};

const hidePopup = () => {
  ipcRenderer.send("hidePopup");
};
/* eslint-enable no-unused-vars */

async function fetchEventsData() {
  const json = await fetchCalendarJson();
  const response = await axios.get(json["url"]);
  const data = ical.parseICS(response["data"]);
  return parseEvents(data);
}

const buildEventsListElement = (events) => {
  return sortEvents(events).map((ev) => {
    let time = moment(ev.start).format("HH:mm");
    let title = ev.summary
    return `${time} _ ${title}\n`;
  }).join("");
}

const attachNextEvents = (nextEvents) => {
  const targetDiv = document.getElementsByClassName("child-small")[0];

  if (targetDiv) {
    const text = buildEventsListElement(nextEvents);
    targetDiv.innerText = text;
  }
}

const storeNextEvents = (events) => {
  storedNextEvents = events;
}

const fetchNextEvents = () => {
  return storedNextEvents;
}

const findNextEvent = (nextEvents) => {
  return sortEvents(nextEvents)[0];
}

const sortEvents = (events) => {
  return events.sort(minutesBetween).reverse();
}

const filterTodayEvents = (events) => {
  return events.filter((ev) => isTodayEvent(ev.start));
};

const filterNextEvents = (events) => {
  return events.filter((ev) => isNextEvent(ev.start));
};

ipcRenderer.on('fromMain', () => {
  const nextEvents = fetchNextEvents();
  attachNextEvents(nextEvents);
});

async function main() {
  const eventsData = await fetchEventsData();
  const flattenEventsData = flattenEvents(eventsData);
  const todayEvents = filterTodayEvents(flattenEventsData);
  const nextEvents = filterNextEvents(todayEvents);
  storeNextEvents(nextEvents);

  const nextEvent = findNextEvent(nextEvents);
  displaySchedule(nextEvent.summary, nextEvent.start);

  setTimersAfterClear(nextEvents);
}

main();
setInterval(main, intervalMin * 60 * 1000);
