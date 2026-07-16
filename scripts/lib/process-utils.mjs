import { spawnSync } from "node:child_process";

export class CommandError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "CommandError";
    this.command = details.command;
    this.args = details.args;
    this.status = details.status;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    this.output = details.output;
  }
}

export function formatCommand(command, args = []) {
  return [command, ...args]
    .map((part) => (/[^\\w./:-]/u.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

export function runCommand(command, args = [], options = {}) {
  const {
    cwd,
    input,
    env,
    stdio = "pipe",
    allowFailure = false,
    printCommand = false,
    forwardOutput = false,
  } = options;

  if (printCommand) {
    console.log(`\n$ ${formatCommand(command, args)}`);
  }

  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    input,
    stdio,
    shell: false,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join("\n");

  if (forwardOutput) {
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
  }

  if (result.error) {
    throw new CommandError(result.error.message, {
      command,
      args,
      status: result.status ?? 1,
      stdout,
      stderr,
      output,
    });
  }

  if ((result.status ?? 0) !== 0 && !allowFailure) {
    throw new CommandError(
      `Command failed with exit code ${result.status}: ${formatCommand(command, args)}`,
      {
        command,
        args,
        status: result.status ?? 1,
        stdout,
        stderr,
        output,
      }
    );
  }

  return {
    command,
    args,
    status: result.status ?? 0,
    stdout,
    stderr,
    output,
  };
}
