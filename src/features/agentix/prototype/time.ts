/* Every Agentix time reads in one zone, London, and says so. */
const LONDON = { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" } as const
export const londonTime = (time: number | string) => `${new Date(time).toLocaleString("en-GB", LONDON)} London`
