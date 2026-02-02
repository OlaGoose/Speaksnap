/**
 * New Concept English Book 3 (NCE3) - 60 lessons.
 * Used by the Textbook tab for voice comparison and analysis.
 */

export interface NCE3Lesson {
  id: number;
  title: string;
  text: string;
}

const TITLES: string[] = [
  'A Puma at Large',
  'Thirteen Equals One',
  'An Unknown Goddess',
  'The Double Life of Alfred Bloggs',
  'The Facts',
  'Smash-and-Grab',
  'Mutilated Ladies',
  'A Famous Monastery',
  'Flying Cats',
  'The Loss of the Titanic',
  'Not Guilty',
  'Life on a Desert Island',
  "It's Only Me",
  'A Noble Gangster',
  'Fifty Pence Worth of Trouble',
  'Mary Had a Little Lamb',
  'The Longest Suspension Bridge in the World',
  'Electric Currents in Modern Art',
  'A Very Dear Cat',
  'Pioneer Pilots',
  'Daniel Mendoza',
  'By Heart',
  "One Man's Meat is Another Man's Poison",
  'A Skeleton in the Cupboard',
  'The Cutty Sark',
  'Wanted: A Large Biscuit Tin',
  'Nothing to Sell and Nothing to Buy',
  'Five Pounds Too Dear',
  'Funny or Not?',
  'The Death of a Ghost',
  'A Lovable Eccentric',
  'A Lost Ship',
  'A Day to Remember',
  'A Happy Discovery',
  'Justice Was Done',
  'A Chance in a Million',
  'The Westhaven Express',
  'The First Calendar',
  'Nothing to Worry About',
  "Who's Who",
  'Illusions of Pastoral Peace',
  'Modern Cavemen',
  'Fully Insured',
  'Speed and Comfort',
  'The Power of the Press',
  'Do It Yourself',
  'Too High a Price?',
  'The Silent Village',
  'The Ideal Servant',
  'New Year Resolutions',
  'Lesson 51',
  'Lesson 52',
  'Lesson 53',
  'Lesson 54',
  'Lesson 55',
  'Lesson 56',
  'Lesson 57',
  'Lesson 58',
  'Lesson 59',
  'Lesson 60',
];

export const NCE3_LESSONS: NCE3Lesson[] = TITLES.map((title, i) => ({
  id: i + 1,
  title,
  text: `Lesson ${i + 1}: ${title}. Practice your pronunciation by reading this lesson aloud. Listen to the reference audio and then record yourself.`,
}));

export function getNCE3Lesson(id: number): NCE3Lesson | undefined {
  return NCE3_LESSONS.find((l) => l.id === id);
}
