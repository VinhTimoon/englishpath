import fs from "node:fs";

export function appendBlockedReport(storyFile, report) {
  fs.appendFileSync(
    storyFile,
    `\n## Blocked Report\n\n- Failed step: ${report.failedStep}\n- Exit code: ${report.exitCode}\n- Attempts: ${report.attempts}\n- Summary: ${report.summary}\n\n### Evidence\n\n\`\`\`text\n${report.failureOutput.trim()}\n\`\`\`\n`
  );
}

export function runGateWithDebug({ storyFile, label, gateCommand, maxFixRounds, createDebugPrompt, runDebugPhase }) {
  let failure = null;

  for (let attempt = 0; attempt <= maxFixRounds; attempt += 1) {
    try {
      gateCommand();
      return { attempts: attempt, failure: null };
    } catch (error) {
      failure = error;
      const output = error.output || error.message || "Unknown failure";
      console.error(`\nGate failed: ${label}`);
      console.error(output);

      if (attempt === maxFixRounds) {
        break;
      }

      console.log(`\nRetrying ${label} with debug phase (${attempt + 1}/${maxFixRounds}).`);
      createDebugPrompt(storyFile, label, output);
      runDebugPhase();
    }
  }

  throw failure;
}
