export function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function gracefully(call) {
  try {
    return await call;
  } catch (e) {
    // ignored
  }
}
