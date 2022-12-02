const rxjs = (await import('../../lib/sys/rxjs.js')).default;


export class Subscribable extends rxjs.Subject {
    dispatch(event_data) {
        this.next(event_data);
    }
}
