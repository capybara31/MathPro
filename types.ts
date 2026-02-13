
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface Post {
  id: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
}

export interface AppState {
  config: TelegramConfig;
  posts: Post[];
  isConfigured: boolean;
}

export enum Tab {
  PUBLISH = 'publish',
  HISTORY = 'history',
  SETTINGS = 'settings'
}
