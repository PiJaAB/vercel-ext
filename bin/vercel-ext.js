import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { NonNormalExitError, VercelBaseError } from "@pija-ab/vercel-ext";

function handleError(err) {
  if (
    typeof err === "object" &&
    err != null &&
    "status" in err &&
    typeof err.status === "number"
  ) {
    process.exitCode = err.status || 1;
  } else {
    console.error(err);
    process.exitCode = 1;
  }
}

function spawnVercel() {
  try {
    if (process.env.VERCEL) {
      const argv = process.argv.slice(2);
      spawnSync("next", argv, { maxBuffer: 1, stdio: "inherit" });
    } else {
      import("@pija-ab/vercel-ext/VercelBinPath").then(({ default: vercelBinPath }) => {
        const argv = [...process.execArgv, vercelBinPath, ...process.argv.slice(2)];
        spawnSync(process.argv[0], argv, { maxBuffer: 1, stdio: "inherit", argv0: 'vercel' });
      }).catch(handleError);
    }
  } catch (err) {
    handleError(err);
  }
}

if (
  process.env.VERCEL ||
  (existsSync(".vercel") && existsSync(".vercel/project.json"))
) {
  spawnVercel();
} else {
  import("@pija-ab/vercel-ext/PullEnvironment")
    .then(({ default: main, unref }) =>
      main()
        .then(spawnVercel)
        .finally(unref)
        .catch((err) => {
          console.error(err);
          process.exit(1);
        })
    )
    .catch((err) => {
      if (err instanceof NonNormalExitError) {
        process.exitCode = err.exitCode || 1;
      } else if (err instanceof VercelBaseError) {
        process.exitCode = 1;
      } else {
        process.stderr.write("\n");
        console.error(err);
      }
      process.exit();
    });
}
