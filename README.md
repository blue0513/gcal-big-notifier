# Gcal Big Notifier

[![Lint](https://github.com/blue0513/gcal-big-notifier/actions/workflows/lint.yml/badge.svg)](https://github.com/blue0513/gcal-big-notifier/actions/workflows/lint.yml)
[![Build](https://github.com/blue0513/gcal-big-notifier/actions/workflows/build.yml/badge.svg)](https://github.com/blue0513/gcal-big-notifier/actions/workflows/build.yml)

[![Image from Gyazo](https://i.gyazo.com/11454f63032669576f7663634cff1c78.gif)](https://gyazo.com/11454f63032669576f7663634cff1c78)

You'll never miss a meeting notification again!

## What is gcal-big-notifier

Connecting with Google Calendar, `gcal-big-notifier` will prevent you from forgetting to attend your next schedule.  
When the next scheduled time is less than minutes away, the big window will appear and stay on the top of screen.

## Quick Start

### 1. Get your iCal URL

First, you should get the iCal URL from Google Calendar. See [this document](https://support.google.com/calendar/answer/37648?hl=en#zippy=%2Cget-your-calendar-view-only).

Then, you should set the URL to `config.json` as follows.

```json
{
  "url": "YOUR URL",
  "fetchInterval": 15.0,
  "notificationMinutes": 2.0
}
```

- fetchInterval (default: `15.0`)
  - the interval minutes to fetch data from Google Calendar
- notificationMinutes (default: `2.0`)
  - minutes before notification triggered

### 2. Run the application

```console
$ npm install
$ npm start
```

The big window of the application will appear before the next schedule starts.
