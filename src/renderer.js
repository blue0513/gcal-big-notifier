const { ipcRenderer } = require("electron");
const ical = require("ical");
const moment = require("moment");
const axios = require("axios");
const fs = require("fs");

const json = JSON.parse(fs.readFileSync("./secret.json", "utf8"));
const within = 10.0; // 10 min
const intervalSec = 5 * 60 * 1000; // 5 min

let timers = [];

const parseTodayEvents = (data) => {
  let events = [];

  for (let k in data) {
    if (data && Object.prototype.hasOwnProperty.call(data, k)) {
      var ev = data[k];
      if (data[k].type == "VEVENT" && isTodayEvent(ev.start)) {
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

const isCloseEvent = (startTime) => {
  const now = moment();
  const duration = moment.duration(moment(startTime).diff(now));
  const minutes = duration.asMinutes();

  return minutes > 0 && minutes < within;
};

const setTimers = (events) => {
  clearTimers(timers);
  const now = moment();

  events.forEach((ev) => {
    let duration = moment.duration(moment(ev.start).diff(now));
    let minutes = duration.asMinutes();
    let time = (minutes - 1) * 60 * 1000;

    console.log(`event: ${ev.summary} in ${time / 1000.0} sec`);

    timers.push(setTimeout(appearFunc, time, ev.summary, ev.start));
  });
};

const clearTimers = (targetTimers) => {
  if (targetTimers.length === 0) return;

  targetTimers.forEach((timer) => {
    clearTimeout(timer);
  });
};

const appearFunc = (title, startTime) => {
  const titleDiv = document.getElementsByClassName("child")[0];
  titleDiv.innerText = title;

  const scheduleDiv = document.getElementsByClassName("schedule")[0];
  scheduleDiv.innerText = moment(startTime).format("HH:mm");

  ipcRenderer.send("sendSchedule");
};

async function setNextTimers() {
  const response = await axios.get(json["url"]);
  const data = ical.parseICS(response["data"]);
  const todayEvents = parseTodayEvents(data);
  const nextEvents = todayEvents.filter((e) => isCloseEvent(e.start));

  console.log(
    "nextEvents: ",
    nextEvents.map((ev) => ev.summary)
  );

  setTimers(nextEvents);
}

/* eslint-disable no-unused-vars */
const buttonClick = () => {
  ipcRenderer.send("hideWindow");
};
/* eslint-enable no-unused-vars */

setNextTimers();
setInterval(setNextTimers, intervalSec);
