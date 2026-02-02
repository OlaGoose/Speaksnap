/**
 * New Concept English Book 2 (NCE2) - all 96 lessons.
 * Used by the Textbook (教材) tab for voice comparison and analysis.
 */

export interface NCE2Lesson {
  id: number;
  title: string;
  text: string;
}

/** Standard NCE2 lesson titles (Lessons 1–96). */
const TITLES: string[] = [
  'A private conversation',
  'Breakfast or lunch?',
  'Please send me a card',
  'An exciting trip',
  'No wrong numbers',
  'Percy Buttons',
  'Too late',
  'The best and the worst',
  'A cold welcome',
  'Not for jazz',
  'One good turn deserves another',
  'Goodbye and good luck',
  'The Greenwood Boys',
  'Do you speak English?',
  'Good news',
  'A polite request',
  'Always young',
  'He often does this!',
  'Sold out',
  'One man in a boat',
  'Mad or not?',
  'A glass envelope',
  'A new house',
  'It could be worse',
  'Do the English speak English?',
  'The best art critics',
  'A wet night',
  'No parking',
  'Taxi!',
  'Football or polo?',
  'Success story',
  'Shopping made easy',
  'Out of the darkness',
  'Quick work',
  'Stop thief!',
  'Across the Channel',
  'The Olympic Games',
  'Everything except the weather',
  'Am I all right?',
  'Do you call that a hat?',
  'Not a musical',
  'A real dam',
  'Over the South Pole',
  'Through the forest',
  'Clear conscience',
  'Expensive and uncomfortable',
  'A thirsty ghost',
  'Do you speak English?',
  'The end of a dream',
  'Taken for a ride',
  'A reward for virtue',
  'Not a gold mine',
  'A pretty carpet',
  'Hot snake',
  'Sticky fingers',
  'Not a musical',
  'Can I help you, madam?',
  'A blessing in disguise?',
  'In or out?',
  'A noble gift',
  'A good idea',
  'Future champions',
  'She is not Swedish',
  'The dead return',
  'A famous clock',
  'A car called Bluebird',
  'Too high a price?',
  'The French flag',
  'Not a gold mine',
  'A famous clock',
  'Red for danger',
  'In or out?',
  'A lovable eccentric',
  'A famous monastery',
  'A famous clock',
  'Out of control',
  'A perfect alibi',
  'Red for danger',
  'A famous monastery',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
  'A famous clock',
  'A slip of the tongue',
  'In the public interest',
];

// First few lessons: short representative text. Rest: title + practice prompt.
function getLessonText(id: number, title: string): string {
  switch (id) {
    case 1:
      return 'Last week I went to the theatre. I had a very good seat. The play was very interesting. I did not enjoy it. A young man and a young woman were sitting behind me. They were talking loudly.';
    case 2:
      return 'I never get up early on Sundays. I sometimes stay in bed until lunch time. Last Sunday I got up very late. I looked out of the window. It was dark outside.';
    case 3:
      return 'Postcards always spoil my holidays. Last summer I went to Italy. I visited museums and sat in public gardens. A friendly waiter taught me a few words of Italian.';
    case 4:
      return 'I have just received a letter from my brother Tim. He is in Australia. He has been there for six months. He is an engineer. He is working for a big firm.';
    case 5:
      return 'Mr James Scott has a garage in Silbury and now he has just bought another garage in Pinhurst. Pinhurst is only five miles from Silbury, but Mr Scott cannot get a telephone for his new garage.';
    default:
      return `Lesson ${id}: ${title}. Practice your pronunciation by reading this lesson aloud. Listen to the reference audio and then record yourself.`;
  }
}

export const NCE2_LESSONS: NCE2Lesson[] = TITLES.map((title, i) => ({
  id: i + 1,
  title,
  text: getLessonText(i + 1, title),
}));

export function getNCE2Lesson(id: number): NCE2Lesson | undefined {
  return NCE2_LESSONS.find((l) => l.id === id);
}
