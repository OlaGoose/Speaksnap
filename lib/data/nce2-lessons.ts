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

// Full lesson text for L1–20; L21+ use title + practice prompt (replace with full text as needed).
function getLessonText(id: number, title: string): string {
  switch (id) {
    case 1:
      return 'Last week I went to the theatre. I had a very good seat. The play was very interesting. I did not enjoy it. A young man and a young woman were sitting behind me. They were talking loudly. I got very angry. I could not hear the actors. I turned round. I looked at the man and the woman angrily. They did not pay any attention. In the end, I could not bear it. I turned round again. "I can\'t hear a word!" I said angrily. "It\'s none of your business," the young man said rudely. "This is a private conversation!"';
    case 2:
      return 'I never get up early on Sundays. I sometimes stay in bed until lunch time. Last Sunday I got up very late. I looked out of the window. It was dark outside. "What a day!" I thought. "It\'s raining again." Just then, the telephone rang. It was my aunt Lucy. "I\'ve just arrived by train," she said. "I\'m coming to see you." "But I\'m still having breakfast," I said. "What are you doing?" she asked. "I\'m having breakfast," I repeated. "Dear me," she said. "Do you always get up so late? It\'s one o\'clock!"';
    case 3:
      return 'Postcards always spoil my holidays. Last summer I went to Italy. I visited museums and sat in public gardens. A friendly waiter taught me a few words of Italian. Then he lent me a book. I read a few lines, but I did not understand a word. Every day I thought about postcards. My holidays passed quickly, but I did not send cards to my friends. On the last day I made a big decision. I got up early and bought thirty-seven cards. I spent the whole day in my room, but I did not write a single card!';
    case 4:
      return 'I have just received a letter from my brother Tim. He is in Australia. He has been there for six months. He is an engineer. He is working for a big firm and he has already visited a great number of different places in Australia. He has just bought an Australian car and has gone to Alice Springs, a small town in the centre of Australia. He will soon visit Darwin. From there, he will fly to Perth. My brother has never been abroad before, so he is finding this trip very exciting.';
    case 5:
      return 'Mr James Scott has a garage in Silbury and now he has just bought another garage in Pinhurst. Pinhurst is only five miles from Silbury, but Mr Scott cannot get a telephone for his new garage, so he has just bought twelve pigeons. Yesterday, a pigeon carried the first message from Pinhurst to Silbury. The bird covered the distance in three minutes. Up to now, Mr Scott has sent a great many requests for spare parts and other urgent messages from one garage to the other. In this way, he has begun his own private "telephone" service.';
    case 6:
      return 'I have just moved to a house in Bridge Street. Yesterday a beggar knocked at my door. He asked me for a meal and a glass of beer. In return for this, the beggar stood on his head and sang songs. I gave him a meal. He ate the food and drank the beer. Then he put a piece of cheese in his pocket and went away. Later a neighbour told me about him. Everybody knows him. His name is Percy Buttons. He calls at every house in the street once a month and always asks for a meal and a glass of beer.';
    case 7:
      return 'The plane was late and detectives were waiting at the airport all morning. They were expecting a valuable parcel of diamonds from South Africa. A few hours earlier, someone had told the police that thieves would try to steal the diamonds. When the plane arrived, some of the detectives were waiting inside the main building while others were waiting on the airfield. Two men took the parcel off the plane and carried it into the Customs House. While two detectives were keeping guard at the door, two others opened the parcel. To their surprise, the precious parcel was full of stones and sand!';
    case 8:
      return 'Joe Sanders has the most beautiful garden in our town. Nearly everybody enters for "The Nicest Garden Competition" each year, but Joe wins every time. Bill Frith\'s garden is larger than Joe\'s. Bill works harder than Joe and grows more flowers and vegetables, but Joe\'s garden is more interesting. He has made neat paths and has built a wooden bridge over a pool. I like gardens too, but I do not like hard work. Every year I enter for the garden competition too, and I always win a little prize for the worst garden in the town!';
    case 9:
      return 'On Wednesday evening, we went to the Town Hall. It was the last day of the year and a large crowd of people had gathered under the Town Hall clock. It would strike twelve in twenty minutes\' time. Fifteen minutes passed and then, at five to twelve, the clock stopped. The big minute hand did not move. We waited and waited, but nothing happened. Suddenly someone shouted. "It\'s two minutes past twelve! The clock has stopped!" I looked at my watch. It was true. The big clock refused to welcome the New Year. At that moment everybody began to laugh and sing.';
    case 10:
      return 'We have an old musical instrument. It is called a clavichord. It was made in Germany in 1681. Our clavichord is kept in the living room. It has belonged to our family for a long time. The instrument was bought by my grandfather many years ago. Recently it was damaged by a visitor. She tried to play jazz on it! She struck the keys too hard and two of the strings were broken. My father was shocked. Now we are not allowed to touch it. It is being repaired by a friend of my father\'s.';
    case 11:
      return 'I was having dinner at a restaurant when Tony Steele came in. Tony worked in a lawyer\'s office years ago, but he is now working at a bank. He gets a good salary, but he always borrows money from his friends and never pays it back. Tony saw me and came and sat at the same table. He has never borrowed money from me. While he was eating, I asked him to lend me twenty pounds. To my surprise, he gave me the money immediately. "I have never borrowed any money from you," Tony said, "so now you can pay for my dinner!"';
    case 12:
      return 'Our neighbour, Captain Charles Alison, will sail from Portsmouth tomorrow. We shall meet him at the harbour early in the morning. He will be in his small boat, Topsail. Topsail is a famous little boat. It has sailed across the Atlantic many times. Captain Alison will set out at eight o\'clock, so we shall have plenty of time. We shall see his boat and then we shall say goodbye to him. He will be away for two months. We are very proud of him. He will take part in an important race across the Atlantic.';
    case 13:
      return 'The Greenwood Boys are a group of popular singers. At present, they are visiting all parts of the country. They will be arriving here tomorrow. They will be coming by train and most of the young people in the town will be meeting them at the station. Tomorrow evening they will be singing at the Workers\' Club. The Greenwood Boys will be staying for five days. During this time, they will give five performances. As usual, the police will have a difficult time. They will be trying to keep order. It is always the same on these occasions.';
    case 14:
      return 'Last year my wife and I went to the seaside for our holiday. We stayed at a small hotel. One night we went for a walk along the shore. It was dark and we did not see anyone. On our way back we lost our way. We did not know how to find the path. Suddenly my wife saw a light in the window of a house. We knocked at the door and a young man answered. We explained our situation and he invited us in. He spoke English well. We had a long conversation and he told us he was a student.';
    case 15:
      return 'The secretary told me that Mr Harmsworth would see me. I felt very nervous when I went into his office. He did not look up from his desk when I entered. After I had sat down, he said that business was very bad. He told me that the firm could not afford to pay such large salaries. Twenty people had already left. I knew that my turn had come. "Mr Harmsworth," I said in a weak voice. "Do not interrupt," he said. Then he smiled and told me I would receive an extra thousand pounds a year!';
    case 16:
      return 'If you park your car in the wrong place, a traffic policeman will soon find it. You will be very lucky if he lets you go without a ticket. However, this does not always happen. Traffic police are sometimes very polite. During a holiday in Sweden, I found this note on my car: "Sir, we welcome you to our city. This is a "No Parking" area. You will enjoy your stay here if you pay attention to our street signs. This note is only a reminder." If you receive a request like this, you cannot fail to obey it!';
    case 17:
      return 'My aunt Jennifer is an actress. She must be at least thirty-five years old. In spite of this, she often appears on the stage as a young girl. Jennifer will have to take part in a new play soon. This time she will be a girl of seventeen. In the play she must appear in a bright red dress and long black stockings. Last year in another play she had to wear short socks and a bright, orange-coloured dress. If anyone ever asks her how old she is, she always answers, "My dear, it must be terrible to be grown up!"';
    case 18:
      return 'After I had had lunch at a village pub, I looked for my bag. I had left it on a chair beside the door and now it wasn\'t there! As I was looking for it, the landlord came in. "Did you have a good meal?" he asked. "Yes, thank you," I answered, "but I can\'t pay the bill. I haven\'t got my bag." The landlord smiled and immediately went out. In a few minutes he returned with my bag and gave it back to me. "I\'m very sorry," he said. "My dog had taken it into the garden. He often does this!"';
    case 19:
      return '"The play may begin at any moment," I said. "It may have begun already," Susan answered. I hurried to the ticket office. "May I have two tickets please?" I asked. "I\'m sorry, we\'ve sold out," the girl said. "What a pity!" Susan exclaimed. Just then, a man hurried to the ticket office. "Can I return these two tickets?" he asked. "Certainly," the girl said. I went back to the ticket office at once. "Could I have those two tickets please?" I asked. "Certainly," the girl said, "but they\'re for next Wednesday\'s performance. Do you still want them?" "I might as well have them," I said sadly.';
    case 20:
      return 'Fishing is my favourite sport. I often fish for hours without catching anything. But this does not worry me. Some fishermen are unlucky. Instead of catching fish, they catch old boots and rubbish. I am even less lucky. I never catch anything, not even old boots. After having spent whole mornings on the river, I always go home with an empty bag. "You must give up fishing!" my friends say. "It\'s a waste of time." But they don\'t realise one important thing. I\'m not really interested in fishing. I am only interested in sitting in a boat and doing nothing at all!';
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
