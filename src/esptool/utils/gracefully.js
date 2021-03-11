export default async function gracefully(call) {
  try {
    return await call;
  } catch (e) {
    // ignored
  }
}
