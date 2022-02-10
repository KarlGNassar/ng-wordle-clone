import {
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { WORDS } from 'src/assets/words';

const WORD_LENGTH = 5;
const NUMBER_OF_TRIES = 6;

const LETTERS = (() => {
  const CHARCODE_START = 97;
  const ALPHABET_SIZE = 26;
  const ret: { [key: string]: boolean } = {};

  for (
    let charcode = CHARCODE_START;
    charcode < CHARCODE_START + ALPHABET_SIZE;
    charcode++
  ) {
    ret[String.fromCharCode(charcode)] = true;
  }

  return ret;
})();

interface Try {
  letters: Letter[];
}

interface Letter {
  text: string;
  state: LetterState;
}

enum LetterState {
  WRONG,
  PARTIAL_MATCH, // letter in word but wrong position
  FULL_MATCH, // letter and position are correct
  PENDING,
}

@Component({
  selector: 'wordle',
  templateUrl: './wordle.component.html',
  styleUrls: ['./wordle.component.scss'],
})
export class WordleComponent {
  @ViewChildren('tryContainer') tryContainer!: QueryList<ElementRef>;

  readonly tries: Try[] = [];

  readonly LetterState = LetterState;

  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
  ];

  private curLetterIndex = 0;

  infoMsg = '';
  fadeOutInfoMsg = false;

  private numberOfSubmittedTries = 0;

  private targetWord = '';

  private won = false;

  private targetWordLetterCounts: { [letter: string]: number } = {};

  constructor() {
    for (let i = 0; i < NUMBER_OF_TRIES; i++) {
      const letters: Letter[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        letters.push({ text: '', state: LetterState.PENDING });
      }
      this.tries.push({ letters });
    }

    const numberOfWords = WORDS.length;
    while (true) {
      const index = Math.floor(Math.random() * numberOfWords);
      const word = WORDS[index];

      if (word.length === WORD_LENGTH) {
        this.targetWord = word.toLowerCase();
        break;
      }
    }
    console.log('target word ==>', this.targetWord);

    for (const letter of this.targetWord) {
      const count = this.targetWordLetterCounts[letter];

      if (count == null) {
        this.targetWordLetterCounts[letter] = 0;
      }
      this.targetWordLetterCounts[letter]++;
    }

    console.log(this.targetWordLetterCounts);
  }

  @HostListener('document: keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  private handleClickKey(key: string) {
    if (this.won) {
      return;
    }

    if (LETTERS[key.toLowerCase()]) {
      if (
        this.curLetterIndex <
        (this.numberOfSubmittedTries + 1) * WORD_LENGTH
      ) {
        this.setLetter(key);
        this.curLetterIndex++;
      }
    } else if (key === 'Backspace') {
      if (this.curLetterIndex > this.numberOfSubmittedTries * WORD_LENGTH) {
        this.curLetterIndex--;
        this.setLetter('');
      }
    } else if (key === 'Enter') {
      this.checkCurrentTry();
    }
  }

  private setLetter(letter: string) {
    const tryIndex = Math.floor(this.curLetterIndex / WORD_LENGTH);
    const letterIndex = this.curLetterIndex - tryIndex * WORD_LENGTH;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  private async checkCurrentTry() {
    const currentTry = this.tries[this.numberOfSubmittedTries];

    if (currentTry.letters.some((letter) => letter.text === '')) {
      this.showInfoMessage('Not Enough Letters');
      return;
    }

    const wordFromCurrentTry = currentTry.letters
      .map((letter) => letter.text)
      .join('')
      .toUpperCase();
    if (!WORDS.includes(wordFromCurrentTry)) {
      this.showInfoMessage('Not in Word List');

      const tryContainer = this.tryContainer.get(this.numberOfSubmittedTries)
        ?.nativeElement as HTMLElement;
      tryContainer.classList.add('shake');

      setTimeout(() => {
        tryContainer.classList.remove('shake');
      }, 500);
      return;
    }

    const targetWordLetterCounts = { ...this.targetWordLetterCounts };
    const states: LetterState[] = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      const expected = this.targetWord[i];
      const currentLetter = currentTry.letters[i];
      const got = currentLetter.text.toLowerCase();
      let state = LetterState.WRONG;

      if (expected === got && targetWordLetterCounts[got] > 0) {
        targetWordLetterCounts[expected]--;
        state = LetterState.FULL_MATCH;
      } else if (
        this.targetWord.includes(got) &&
        targetWordLetterCounts[got] > 0
      ) {
        targetWordLetterCounts[expected]--;
        state = LetterState.PARTIAL_MATCH;
      }
      states.push(state);
    }
    console.log(states);

    const tryContainer = this.tryContainer.get(this.numberOfSubmittedTries)
      ?.nativeElement as HTMLElement;
    const letterElements = tryContainer.querySelectorAll('.letter-container');

    for (let i = 0; i < letterElements.length; i++) {
      const currentLetterElement = letterElements[i];
      currentLetterElement.classList.add('fold');
      await this.wait(180);
      currentTry.letters[i].state = states[i];
      currentLetterElement.classList.remove('fold');
      await this.wait(180);
    }

    this.numberOfSubmittedTries++;

    if (states.every((state) => state === LetterState.FULL_MATCH)) {
      this.showInfoMessage('NICE!');
      this.won = true;

      for (let i = 0; i < letterElements.length; i++) {
        const currentLetterElement = letterElements[i];
        currentLetterElement.classList.add('bounce');
        await this.wait(160);
      }
      return;
    }

    if (this.numberOfSubmittedTries === NUMBER_OF_TRIES) {
      this.showInfoMessage(this.targetWord.toUpperCase(), false);
    }
  }

  private showInfoMessage(msg: string, hide = true) {
    this.infoMsg = msg;
    if (hide) {
      setTimeout(() => {
        this.fadeOutInfoMsg = true;
        setTimeout(() => {
          this.infoMsg = '';
          this.fadeOutInfoMsg = false;
        }, 500);
      }, 2000);
    }
  }

  private async wait(ms: number) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
