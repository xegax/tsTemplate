declare module 'xml2js' {
  interface Options {
    strict?: boolean;
  }
  function parseString(src: string, opts: Options, callback: (err, res) => void);
}