var pg = require('pg');
 
// create a config to configure both pooling behavior 
// and client options 
// note: all config is optional and the environment variables 
// will be read if the config is not present 
var config = {
  user: 'root', //env var: PGUSER 
  database: 'postgres', //env var: PGDATABASE 
  password: 'z3cq15as', //env var: PGPASSWORD 
  host: 'localhost', // Server hosting the postgres database 
  port: 5432, //env var: PGPORT 
  max: 10, // max number of clients in the pool 
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed 
};
 
 
//this initializes a connection pool 
//it will keep idle connections open for 30 seconds 
//and set a limit of maximum 10 idle clients 
var pool = new pg.Pool(config);
 
let t = Date.now();
function time() {
	let now = Date.now();
	let t2 = now - t;
	t = now;
	return t2 / 1000;
}
pool.connect(function(err, client, done) {
  time();
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  let n = 10;
  function query() {
	  client.query('SELECT author, count(author) as count from booksdb.books group by author order by count asc limit 300 ', function(err, result) {
		//call `done(err)` to release the client back to the pool (or destroy it if there is an error) 
		done(err);
	 
		if(err) {
		  return console.error('error running query', err);
		}
		console.log('300 rows', time());
		n--;
		if (n > 0)
		   query();
		//output: 1 
	  });
  }
  query();
});
 
pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool 
  // the pool itself will emit an error event with both the error and 
  // the client which emitted the original error 
  // this is a rare occurrence but can happen if there is a network partition 
  // between your application and the database, the database restarts, etc. 
  // and so you might want to handle it and at least log it out 
  console.error('idle client error', err.message, err.stack)
});