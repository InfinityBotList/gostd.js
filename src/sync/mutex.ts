/**
 * Implements a mutex lock.
 * 
 * As JS is single-threaded, we can simply use a boolean to represent the lock.
 */

export class Mutex {
    private _locked: boolean;

    constructor() {
        this._locked = false;
    }

    /**
     * Locks the mutex.
     * 
     * If the mutex is already locked, the calling goroutine blocks until the mutex is available.
     */
    Lock(): void {
        while(this._locked) {}
        this._locked = true;
    }

    /**
     * Unlocks the mutex.
     * 
     * If the mutex is not locked, this method panics.
     */
    Unlock(): void {
        if(!this._locked) {
            throw new Error("Unlock of unlocked mutex");
        }
        this._locked = false;
    }

    LockAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                if(!this._locked) {
                    this._locked = true;
                    clearInterval(interval);
                    resolve();
                }
            }, 0);
        });
    }

    UnlockAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            if(!this._locked) {
                reject(new Error("Unlock of unlocked mutex"));
            }
            this._locked = false;
            resolve();
        });
    }

    /**
     * Returns if the mutex is locked.
     */
    IsLocked(): boolean {
        return this._locked;
    }
}