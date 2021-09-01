# Gcal Big Notifier

[![Lint](https://github.com/blue0513/gcal-big-notifier/actions/workflows/lint.yml/badge.svg)](https://github.com/blue0513/gcal-big-notifier/actions/workflows/lint.yml)

[![Image from Gyazo](https://i.gyazo.com/11454f63032669576f7663634cff1c78.gif)](https://gyazo.com/11454f63032669576f7663634cff1c78)

You'll never miss a meeting notification again!

## What is gcal-big-notifier

Connecting with Google Calendar, `gcal-big-notifier` will prevent you from forgetting to attend your next schedule.  
When the next scheduled time is less than a minute away, the big window will appear and stay on the top of screen.

## Quick Start

### 1. Get your iCal URL

First, you should get the iCal URL from Google Calendar. See [this document](https://support.google.com/calendar/answer/37648?hl=en#zippy=%2Cget-your-calendar-view-only).

Then, you should set the URL to `secret.json` as follows.

```json
{
  "url": "YOUR URL"
}
```

### 2. Run the application

```console
$ npm install
$ npm run start
```

The big window of the application will appear 1 min before the next schedule starts.
