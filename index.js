const { ipcRenderer } = require('electron')
const ical = require('ical');
const https = require('https');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs');

const json = JSON.parse(fs.readFileSync('./secret.json', 'utf8'))
const within = 10.0; // 10 min
const intervalSec = 5*60*1000; // 5 min

let timers = [];

fetchTodayEvents = (data) => {
  let results = [];

  for (let k in data) {
    if (data.hasOwnProperty(k)) {
      var ev = data[k];
      if (data[k].type == 'VEVENT' && isTodayEvent(ev.start)) {
        results.push(ev);
      }
    }
  }

  console.log('today events: ', results.map((ev) => ev.summary));
  return results;
}

isTodayEvent = (startTime) => {
  const isCurrentDate = moment(startTime).isSame(new Date(), 'day');
  return isCurrentDate;
}

isCloseEvent = (startTime) => {
  const now = moment();
  const duration = moment.duration(moment(startTime).diff(now));
  const minutes = duration.asMinutes();

  return minutes > 0 && minutes < within;
}

async function fetchCloseEvent() {
  const response = await axios.get(json['url']);
  const data = ical.parseICS(response['data']);
  const todayEvents = fetchTodayEvents(data);
  const events = todayEvents.filter(ev => isCloseEvent(ev.start));

  return events;
}

setTimers = (events) => {
  clearTimers(timers);
  const now = moment();

  events.forEach(ev => {
    let duration = moment.duration(moment(ev.start).diff(now));
    let minutes = duration.asMinutes();
    let time = (minutes - 1) * 60 * 1000;

    console.log(`event: ${ev.summary} in ${time/1000.0} sec`)

    timers.push(
      setTimeout(appearFunc, time, ev.summary, ev.start)
    );
  });
}

clearTimers = (targetTimers) => {
  if (targetTimers.length === 0) {
    return;
  }

  targetTimers.forEach(timer => {
    clearTimeout(timer);
  });
}

appearFunc = (title, startTime) => {
  console.log('title: ', title);

  const titleDiv = document.getElementsByClassName('child')[0];
  titleDiv.innerText = title;

  const scheduleDiv = document.getElementsByClassName('schedule')[0];
  scheduleDiv.innerText = moment(startTime).format('HH:mm');
  ipcRenderer.send('sendSchedule');
}

async function setNextTimers() {
  const nextEvents = await fetchCloseEvent();
  console.log('nextEvents: ', nextEvents.map((ev) => ev.summary));
  setTimers(nextEvents);
}

buttonClick = () => {
  ipcRenderer.send('hideWindow');

}

setNextTimers();
setInterval(setNextTimers, intervalSec);
