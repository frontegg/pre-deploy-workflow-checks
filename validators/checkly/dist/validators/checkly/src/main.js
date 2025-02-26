"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var core = __toESM(require("@actions/core"));
var import_axios = __toESM(require("axios"));
const envrionmentMap = {
  "staging": "STG",
  "production-au": "AU",
  "production-us": "US",
  "production-global": "GLOBAL"
};
const client = import_axios.default.create({
  baseURL: "https://api.checklyhq.com/v1",
  headers: {
    "x-checkly-account": core.getInput("checkly-account-id"),
    Authorization: `Bearer ${core.getInput("checkly-api-key")}`
  }
});
const getAllChecksStatus = async () => {
  const { data } = await client.get("/check-statuses");
  return data;
};
const getAllChecks = async () => {
  const limit = 100;
  let allChecks = [];
  let page = 1;
  let hasMoreData = true;
  while (hasMoreData) {
    const { data } = await client.get("/checks", {
      params: {
        page,
        limit
      }
    });
    allChecks = [...allChecks, ...data];
    hasMoreData = data.length === limit;
    page++;
  }
  return allChecks;
};
const main = async () => {
  const checks = await getAllChecks();
  const checksStatus = await getAllChecksStatus();
  const environment = envrionmentMap[core.getInput("environment")];
  if (!environment) {
    core.setFailed(`Invalid environment: ${core.getInput("environment")}`);
    return;
  }
  const failedOrDegradedCheck = checksStatus.find(
    (checkStatus) => (checkStatus.hasFailures || checkStatus.isDegraded) && checks.find((check) => check.id === checkStatus.checkId)?.tags?.includes(environment)
  );
  if (failedOrDegradedCheck) {
    core.setOutput("result", "failure");
    return;
  }
  core.setOutput("result", "success");
};
main().catch(
  (error) => core.setFailed(
    JSON.stringify({ message: error.message, data: error.response?.data })
  )
);
