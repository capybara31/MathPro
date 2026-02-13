
import { TelegramConfig } from '../types';

export const sendTelegramMessage = async (config: TelegramConfig, text: string) => {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text: text,
      parse_mode: 'HTML'
    }),
  });
  return response.json();
};

export const sendTelegramPhoto = async (config: TelegramConfig, photo: File, caption?: string) => {
  const url = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', config.chatId);
  formData.append('photo', photo);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const getBotInfo = async (token: string) => {
  const url = `https://api.telegram.org/bot${token}/getMe`;
  const response = await fetch(url);
  return response.json();
};
