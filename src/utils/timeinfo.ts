let startingTime = new Date();
export function setStartingTime() {
  startingTime = new Date();
}

export function generateCurrentDateTime() {
  return new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function getTimeSinceStart() {
  return new Date(new Date().getTime() - startingTime.getTime())
    .toISOString()
    .slice(11, 19);
}
