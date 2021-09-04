"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
exports.__esModule = true;
var electron_1 = require("electron");
var ical_1 = require("ical");
var moment_1 = require("moment");
var axios_1 = require("axios");
var fs = require("fs");
var path = require("path");
// configurable variables
var notifyBeforeMin = 2.0;
var intervalMin = 15.0;
var notificationTimers = [];
var storedNextEvents = [];
var fetchConfigJson = function () {
  var fileBody = fs.readFileSync(
    path.join(__dirname, "../config.Json"),
    "utf8"
  );
  return JSON.parse(fileBody);
};
var parseEvents = function (data) {
  var events = [];
  for (var k in data) {
    if (data && Object.prototype.hasOwnProperty.call(data, k)) {
      var ev = data[k];
      if (ev.type == "VEVENT") {
        events.push(ev);
      }
    }
  }
  return events;
};
// TODO: should Unit Test
var flattenEvents = function (nestedEvents) {
  return nestedEvents
    .map(function (ev) {
      var evs = [];
      if (ev.rrule) {
        var todayRules = ev.rrule.all().filter(function (time) {
          return isTodayEvent((0, moment_1["default"])(time).toDate());
        });
        var todayEvents = todayRules.map(function (time) {
          return { type: "VEVENT", summary: ev.summary, start: time };
        });
        evs.push(todayEvents);
      }
      if (ev.recurrences) {
        var todayEvents = ev.recurrences.filter(function (ev) {
          isTodayEvent((0, moment_1["default"])(ev.start).toDate());
        });
        evs.push(todayEvents);
      }
      evs.push(ev);
      return evs;
    })
    .flat(Infinity);
};
var isTodayEvent = function (startTime) {
  var isCurrentDate = (0, moment_1["default"])(startTime).isSame(
    new Date(),
    "day"
  );
  return isCurrentDate;
};
var isNextEvent = function (startTime) {
  var now = new Date();
  var minutes = minutesBetween(now, startTime);
  return minutes > 0;
};
var minutesBetween = function (since, until) {
  var duration = moment_1["default"].duration(
    (0, moment_1["default"])(until).diff(since)
  );
  return duration.asMinutes();
};
var setTimersAfterClear = function (events) {
  clearTimers(notificationTimers);
  if (events.length === 0) return;
  var now = new Date();
  events.forEach(function (ev) {
    var minutes = minutesBetween(
      now,
      (0, moment_1["default"])(ev.start).toDate()
    );
    var minutesFromNow = (minutes - notifyBeforeMin) * 60 * 1000;
    var title = ev.summary;
    var startTime = (0, moment_1["default"])(ev.start);
    notificationTimers.push(
      setTimeout(displaySchedule, minutesFromNow, title, startTime)
    );
  });
};
var clearTimers = function (targetTimers) {
  if (targetTimers.length === 0) return;
  targetTimers.forEach(function (timer) {
    clearTimeout(timer);
  });
};
var displaySchedule = function (title, startTime) {
  var titleDiv = document.getElementsByClassName("child")[0];
  var scheduleDiv = document.getElementsByClassName("schedule")[0];
  if (titleDiv) {
    titleDiv.innerText = title;
  }
  if (scheduleDiv) {
    scheduleDiv.innerText = (0, moment_1["default"])(startTime).format("HH:mm");
  }
  electron_1.ipcRenderer.send("sendSchedule");
};
/* eslint-disable no-unused-vars */
var buttonClick = function () {
  electron_1.ipcRenderer.send("hideWindow");
};
var showPopup = function () {
  electron_1.ipcRenderer.send("showPopup");
};
var hidePopup = function () {
  electron_1.ipcRenderer.send("hidePopup");
};
/* eslint-enable no-unused-vars */
var setConfiguration = function (configJson) {
  var maybeNotifyBeforeMin = configJson["notificationMinutes"];
  var maybeFetchInterval = configJson["fetchInterval"];
  if (maybeNotifyBeforeMin) {
    notifyBeforeMin = maybeNotifyBeforeMin;
  }
  if (maybeFetchInterval) {
    intervalMin = maybeFetchInterval;
  }
};
function fetchEventsData(configJson) {
  return __awaiter(this, void 0, void 0, function () {
    var response, data;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, axios_1["default"].get(configJson["url"])];
        case 1:
          response = _a.sent();
          data = ical_1["default"].parseICS(response["data"]);
          return [2 /*return*/, parseEvents(data)];
      }
    });
  });
}
var buildEventsListElement = function (events) {
  return sortEvents(events)
    .map(function (ev) {
      var time = (0, moment_1["default"])(ev.start).format("HH:mm");
      var title = ev.summary;
      return time + " _ " + title + "\n";
    })
    .join("");
};
var attachNextEvents = function (nextEvents) {
  var targetDiv = document.getElementsByClassName("child-small")[0];
  if (targetDiv) {
    var text =
      nextEvents.length > 0
        ? buildEventsListElement(nextEvents)
        : "All Schedule Finished";
    targetDiv.innerText = text;
  }
};
var storeNextEvents = function (events) {
  storedNextEvents = events;
};
var fetchNextEvents = function () {
  return storedNextEvents;
};
var findNextEvent = function (nextEvents) {
  return sortEvents(nextEvents)[0];
};
var sortEvents = function (events) {
  return events
    .sort(function (a, b) {
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
var filterTodayEvents = function (events) {
  return events.filter(function (ev) {
    return isTodayEvent((0, moment_1["default"])(ev.start).toDate());
  });
};
var filterNextEvents = function (events) {
  return events.filter(function (ev) {
    return isNextEvent((0, moment_1["default"])(ev.start).toDate());
  });
};
var registerIpcReceive = function () {
  electron_1.ipcRenderer.on("fromMain", function () {
    var nextEvents = fetchNextEvents();
    attachNextEvents(nextEvents);
  });
};
function main(configJson) {
  return __awaiter(this, void 0, void 0, function () {
    var eventsData,
      flattenEventsData,
      todayEvents,
      nextEvents,
      nextEvent,
      title;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, fetchEventsData(configJson)];
        case 1:
          eventsData = _a.sent();
          flattenEventsData = flattenEvents(eventsData);
          todayEvents = filterTodayEvents(flattenEventsData);
          nextEvents = filterNextEvents(todayEvents);
          storeNextEvents(nextEvents);
          nextEvent = findNextEvent(nextEvents);
          if (nextEvent) {
            title = nextEvent.summary ? nextEvent.summary : "no title";
            displaySchedule(
              title,
              (0, moment_1["default"])(nextEvent.start).toDate()
            );
          } else {
            displaySchedule(
              "All Schedule Finished",
              (0, moment_1["default"])().toDate()
            );
          }
          setTimersAfterClear(nextEvents);
          return [2 /*return*/];
      }
    });
  });
}
function beforeStart(configJson) {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      registerIpcReceive();
      registerButtonEvents();
      setConfiguration(configJson);
      return [2 /*return*/];
    });
  });
}
var registerButtonEvents = function () {
  var closeButton = document.getElementById("hide-button");
  if (closeButton) {
    closeButton.addEventListener("click", function () {
      buttonClick();
    });
  }
  var popupButton = document.getElementById("show-popup-button");
  if (popupButton) {
    popupButton.addEventListener("click", function () {
      showPopup();
    });
  }
  var hidePopupButton = document.getElementById("hide-popup-button");
  if (hidePopupButton) {
    hidePopupButton.addEventListener("click", function () {
      hidePopup();
    });
  }
};
function start() {
  return __awaiter(this, void 0, void 0, function () {
    var configJson;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          configJson = fetchConfigJson();
          return [4 /*yield*/, beforeStart(configJson)];
        case 1:
          _a.sent();
          console.log(
            "fetchInterval: " +
              intervalMin +
              ", notifyBeforeMin: " +
              notifyBeforeMin
          );
          main(configJson);
          setInterval(main, intervalMin * 60 * 1000);
          return [2 /*return*/];
      }
    });
  });
}
start();
