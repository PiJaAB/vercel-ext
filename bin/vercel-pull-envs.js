import main, { AbortedError, unref } from "@pija-ab/vercel-ext/PullEnvironment";

main().catch((err) => {
  if (
    typeof err === "object" &&
    err != null &&
    "status" in err &&
    typeof err.status === "number"
  ) {
    process.exitCode = err.status || 1;
  } else if (err instanceof AbortedError) {
    console.error(err.message);
    console.error(
      `\nFailed to set up environment from vercel. Please run 'yarn vercel link' and 'yarn vercel pull' manually.`
    );
  } else {
    console.error(err);
    process.exitCode = 1;
  }
}).finally(() => {
  unref();
});
