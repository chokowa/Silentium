/**
 * AudioContext シングルトン管理
 * アプリ全体で一つのAudioContextを共有する
 */
export class AudioContextManager {
    private static instance: AudioContextManager;
    private context: AudioContext | null = null;

    private constructor() { }

    public static getInstance(): AudioContextManager {
        if (!AudioContextManager.instance) {
            AudioContextManager.instance = new AudioContextManager();
        }
        return AudioContextManager.instance;
    }

    public getContext(): AudioContext {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.context = new AudioContextClass();
        }
        return this.context;
    }

    public async resume(): Promise<void> {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    public close(): void {
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}
