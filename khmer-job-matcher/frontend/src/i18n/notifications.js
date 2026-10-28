import { translate } from './core.js'

export function notificationText(message, language) {
  if (typeof message !== 'string') return message
  // Translate only the known server-generated envelope. Never translate the job title.
  const match = /^Your application for ([\s\S]+) is now (submitted|reviewing|shortlisted|accepted|rejected|withdrawn)\.$/.exec(message)
  return match ? translate(language, 'Your application for {job} is now {status}.', {
    job: match[1], status: translate(language, match[2]),
  }) : message
}
