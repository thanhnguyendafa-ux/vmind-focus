import { Badge } from './types';
import { formatDuration } from './utils/timeUtils';

const generateFibonacciBadges = (): Badge[] => {
    const badges: Badge[] = [];
    let a = 0;
    let b = 1;

    const names = [
      "Hour of Focus", "Two Paths Converge", "Threefold Dedication", "Five Rivers Flow", "Eightfold Path",
      "Thirteen Moons", "Student of the Grove", "Chronicler of Seasons", "Sage of the Ancient Wood", "Master of the Hidden Stream",
      "Seeker of Dawn", "Keeper of the Echo", "Whisperer of Stone", "Weaver of Light", "Guardian of Silence",
      "Architect of Stillness", "Dreamer of Tides", "Voyager of the Vast", "Star-Charter", "Sculptor of Horizons",
      "Adept of the Unseen", "Conductor of Years", "Oracle of the Deep", "Master of Cycles", "Chronomancer's Apprentice",
      "Time Weaver", "Epoch Drifter", "Temporal Master", "Centurion Scholar", "Millennial Sage",
      "Aeon Gazer", "Watcher of Ages", "Infinity's Attendant", "Eternal Scholar", "Timeless Voyager",
      "Master of Eons", "Keeper of Forever", "Architect of Infinity", "Celestial Historian", "Cosmic Chronicler",
      "Galactic Sage", "Universal Librarian", "Master of Realities", "Knower of All Times", "The Timeless One",
      "Ascendant Scholar", "The Transcendent", "Oracle of Eternity", "Guardian of All That Is", "The Final Chapter"
    ];

    for (let i = 0; i < 50; i++) {
        const fibNumber = i === 0 ? 1 : a + b;
        [a, b] = [b, fibNumber];

        const hours = fibNumber;
        const name = names[i] || `Time Lord ${i + 1}`;
        const seconds = hours * 3600;
        const description = `Study for a total of ${formatDuration(seconds)}.`;
        
        badges.push({
            id: `time-fib-${i + 1}`,
            name: name,
            description: description,
            icon: 'clock',
            type: 'time',
            value: seconds, // value in seconds
        });
    }

    return badges;
};


export const BADGES: Badge[] = generateFibonacciBadges();
