/** 사용자에게 그대로 보여줄 한국어 메시지 전용 오류. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
