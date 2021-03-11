export default function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
