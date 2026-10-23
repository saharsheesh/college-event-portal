const HONORIFICS = /^(dr|mr|mrs|ms|miss|prof)\.?$/i;

// First name for greetings, skipping titles: "Dr. Admin Kumar" -> "Admin"
export function firstName(fullName = '') {
  const words = fullName.trim().split(/\s+/);
  return words.find(w => !HONORIFICS.test(w)) || words[0] || '';
}
