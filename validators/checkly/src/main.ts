import * as core from "@actions/core";
import axios from "axios";
import { Check, CheckStatus } from "./types";

const environmentMap = {
  'staging': 'STG',
  'production-au': 'AU',
  'production-us': 'US',
  'production-global': 'GLOBAL',
};

const client = axios.create({
  baseURL: "https://api.checklyhq.com/v1",
  headers: {
    "x-checkly-account": core.getInput("checkly-account-id"),
    Authorization: `Bearer ${core.getInput("checkly-api-key")}`,
  },
});

const getAllChecksStatus = async (): Promise<CheckStatus[]> => {
  const { data } = await client.get<CheckStatus[]>("/check-statuses");
  return data;
};

const getAllChecks = async (): Promise<Check[]> => {
  const limit = 100;
  let allChecks: Check[] = [];
  let page = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    const { data } = await client.get<Check[]>("/checks", {
      params: { page, limit },
    });

    allChecks = [...allChecks, ...data];
    hasMoreData = data.length === limit;
    page++;
  }

  return allChecks;
};

const main = async (): Promise<void> => {
  const checks = await getAllChecks();
  const checksStatus = await getAllChecksStatus();
  const environment = environmentMap[core.getInput("environment") as keyof typeof environmentMap];

  if (!environment) {
    core.setFailed(`Invalid environment: ${core.getInput("environment")}`);
    return;
  }

  const failedOrDegradedCheck = checksStatus.find(
    (checkStatus) =>
      (checkStatus.hasFailures || checkStatus.isDegraded) &&
      checks.find((check) => check.id === checkStatus.checkId)?.tags?.includes(environment)
  );

  if (failedOrDegradedCheck) {
    const failedCheck = checks.find((check) => check.id === failedOrDegradedCheck.checkId);
    const checkName = failedCheck?.name || "Unknown Check";
    const checkId = failedCheck?.id;
    const checklyDashboardUrl = `https://app.checklyhq.com/checks/${checkId}`;

    console.error(`❌ Check Failed: ${checkName}`);
    console.error(`🔗 View details: ${checklyDashboardUrl}`);
    
    core.setOutput("result", "failure");
    core.setOutput("failed_check_name", checkName);
    core.setOutput("failed_check_id", checkId);
    core.setOutput("checkly_dashboard_url", checklyDashboardUrl);
    core.setOutput("error_message", `Check failed: ${checkName}. View details: ${checklyDashboardUrl}`);
    
    core.setFailed(`Check failed: ${checkName}. View details: ${checklyDashboardUrl} or: https://g03dtl52.checkly-dashboards.com/`);
    return;
  }

  console.log("✅ All checks passed!");
  core.setOutput("result", "success");
};

main().catch((error) => {
  console.error("🚨 Error occurred:", error);
  core.setFailed(
    JSON.stringify({ message: error.message, data: error.response?.data })
  );
});
