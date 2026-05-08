import _ from 'lodash';

process.on('message', (msg: unknown) => {
  if ((msg as { type?: string } | null)?.type === 'ping') {
    process.send?.({
      type: 'pong',
      payload: _.upperFirst('hello from worker'),
      pid: process.pid,
    });
  }
});
