const { ipcRenderer } = require("electron");
const ical = require("ical");
const moment = require("moment");
const axios = require("axios");
const fs = require("fs").promises;

const notifyBeforeMin = 1.0;
const intervalMin = 5.0;

let notificationTimers = [];

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
/* eslint-enable no-unused-vars */

async function fetchEventsData() {
  const json = await fetchCalendarJson();
  const response = await axios.get(json["url"]);
  const data = ical.parseICS(response["data"]);
  return parseEvents(data);
}

const filterTodayEvents = (events) => {
  return events.filter((ev) => isTodayEvent(ev.start));
};

const filterNextEvents = (events) => {
  return events.filter((ev) => isNextEvent(ev.start));
};

async function main() {
  const eventsData = await fetchEventsData();
  const todayEvents = filterTodayEvents(eventsData);
  const nextEvents = filterNextEvents(todayEvents);

  console.log(
    "next: ",
    nextEvents.map((e) => e.summary)
  );

  setTimersAfterClear(nextEvents);
}

main();
setInterval(main, intervalMin * 60 * 1000);
