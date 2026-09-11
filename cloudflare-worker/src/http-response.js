export class WorkerHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "WorkerHttpError";
    this.status = status;
  }
}

export function badRequest(message) {
  throw new WorkerHttpError(400, message);
}

export function forbidden(message = "Not allowed.") {
  throw new WorkerHttpError(403, message);
}

export function conflict(message = "The record already exists.") {
  throw new WorkerHttpError(409, message);
}
