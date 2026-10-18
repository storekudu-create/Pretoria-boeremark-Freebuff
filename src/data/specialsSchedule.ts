/** Weekly display window in the market's timezone, independent of the visitor's location. */
export function isWeeklySpecialsTime(date: Date, saturdayClosingMinutes: number): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute)

  // A new weekly display window starts on Sunday; Saturday ends at closing time.
  return values.weekday !== "Sat" || currentMinutes < saturdayClosingMinutes
}
