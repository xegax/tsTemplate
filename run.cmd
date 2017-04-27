call ..\env.cmd
%HTTP-SERVER%
%MYSQL%
start http://localhost:8080/examples/index.html
node src\server\test-table-server