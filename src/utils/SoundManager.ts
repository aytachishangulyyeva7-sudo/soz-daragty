import { Howl } from 'howler';

import correctSound from '../assets/sounds/correct.mp3';
import wrongSound from '../assets/sounds/wrong.mp3';
import tickSoundSrc from '../assets/sounds/tick.mp3';
import tensionSoundSrc from '../assets/sounds/tension.mp3';

class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private tensionSound: Howl | null = null;
  private tickSound: Howl | null = null;
  private tickInterval: NodeJS.Timeout | null = null; // Täze: interval saklaýarys

  private unlocked = false;

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    this.sounds.set('correct', new Howl({
      src: [correctSound],
      volume: 0.7,
      preload: true,
    }));

    this.sounds.set('wrong', new Howl({
      src: [wrongSound],
      volume: 0.7,
      preload: true,
    }));


    this.tickSound = new Howl({
      src: [tickSoundSrc],
      volume: 0.5,
      preload: true,
    });

    this.tensionSound = new Howl({
      src: [tensionSoundSrc],
      volume: 0.3,
      loop: true,
      preload: true,
      rate: 1.0,
    });
  }

  unlockAudio() {
    if (this.unlocked) return;
    const unlockSound = new Howl({
      src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='],
      autoplay: true,
      volume: 0,
      onload: () => {
        unlockSound.play();
        this.unlocked = true;
        console.log('🔊 Sesler unlock edildi (mobil uyumlu)');
      },
    });
  }

  playCorrect() {
    this.unlockAudio();
    this.sounds.get('correct')?.play();
  }

  playWrong() {
    this.unlockAudio();
    this.sounds.get('wrong')?.play();
  }


  // Täze: Her sekunt tick çal
startTicking() {
  this.unlockAudio();
  this.stopTicking(); // Önceki interval'ı temizle

  // HEMEN tick çal
  this.tickSound?.stop();
  this.tickSound?.play();

  // Her saniye tick çal
  this.tickInterval = setInterval(() => {
    this.tickSound?.stop();
    this.tickSound?.play();
  }, 1000);

  // TENSION'I DURDUR
  this.stopTension();
}

  // Täze: Tick gaýtalamagy togtat
  stopTicking() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  startTension(speedMultiplier = 1.0) {
    this.unlockAudio();
    if (this.tensionSound) {
      this.tensionSound.rate(speedMultiplier);
      if (!this.tensionSound.playing()) {
        this.tensionSound.play();
      }
    }
  }

  updateTensionSpeed(speedMultiplier: number) {
    if (this.tensionSound && this.tensionSound.playing()) {
      this.tensionSound.rate(speedMultiplier);
    }
  }

  stopTension() {
    this.tensionSound?.stop();
  }

  setTensionVolume(volume: number) {
    if (this.tensionSound) {
      this.tensionSound.volume(volume);
    }
  }

  stopAll() {
    Howler.stop();
    this.stopTicking();
  }
}

export const soundManager = new SoundManager(); 