/**
 * Implements a read-write mutex lock with a preference for reads.
 */

export class RWMutex {
    private _readers: number;
    private _writers: number;
    private _pendingWriters: number;

    constructor() {
        this._readers = 0;
        this._writers = 0;
        this._pendingWriters = 0;
    }

    /**
     * Locks the mutex for reading.
     * 
     * If the mutex is locked for writing, the calling goroutine blocks until the mutex is available.
     */
    RLock(): void {
        while(this._writers > 0 || this._pendingWriters > 0) {}
        this._readers++;
    }

    /**
     * Unlocks the mutex for reading.
     * 
     * If the mutex is not locked for reading, this method panics.
     */
    RUnlock(): void {
        if(this._readers == 0) {
            throw new Error("Unlock of unlocked RWMutex");
        }
        this._readers--;
    }

    /**
     * Locks the mutex for writing.
     * 
     * If the mutex is locked for reading or writing, the calling goroutine blocks until the mutex is available.
     */
    Lock(): void {
        this._pendingWriters++;
        while(this._readers > 0 || this._writers > 0) {}
        this._pendingWriters--;
        this._writers++;
    }

    /**
     * Unlocks the mutex for writing.
     * 
     * If the mutex is not locked for writing, this method panics.
     */
    Unlock(): void {
        if(this._writers == 0) {
            throw new Error("Unlock of unlocked RWMutex");
        }
        this._writers--;
    }

    /**
     * Returns if the mutex is locked for reading.
     */
    IsRLocked(): boolean {
        return this._readers > 0;
    }

    /**
     * Returns if the mutex is locked for writing.
     */
    IsLocked(): boolean {
        return this._writers > 0;
    }
}