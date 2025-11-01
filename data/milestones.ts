import { Milestone } from '../types';

const titles = [
  "Neophyte", "Initiate", "Acolyte", "Adept", "Scribe", "Scholar", "Erudite", "Savant", "Sage", "Master",
  "Linguist", "Lexicographer", "Etymologist", "Philologist", "Grammarian", "Rhetorician", "Dialectician",
  "Philosopher", "Prodigy", "Polymath", "Illuminatus", "Chronicler", "Oracle", "Loremaster", "Archivist"
];
const tiers = ["", "Adept", "Master", "Grandmaster", "Enlightened"];
const materials = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Obsidian", "Celestial", "Ethereal", "Arcane", "Divine"];

const generateMilestones = (): Milestone[] => {
    const list: Milestone[] = [];
    let a = 0;
    let b = 1;
    let nameCounter = 0;

    for (let i = 0; i < 300; i++) {
        const temp = a;
        a = b;
        b = temp + b;
        
        const title = titles[nameCounter % titles.length];
        const tier = tiers[Math.floor(nameCounter / titles.length) % tiers.length];
        const material = materials[Math.floor(nameCounter / (titles.length * tiers.length)) % materials.length];

        let name = `${material} ${tier} ${title}`.replace(/\s+/g, ' ').trim();
        const xpThreshold = b * 10;
        
        list.push({
            id: `milestone-${i}`,
            xpThreshold,
            name: name,
            description: `Achieved by accumulating ${xpThreshold.toLocaleString()} XP.`,
        });
        nameCounter++;
    }
    return list;
}

export const milestones: Milestone[] = generateMilestones();
