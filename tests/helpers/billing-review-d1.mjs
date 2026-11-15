// Test-only D1 compatibility adapter backed by real in-memory SQLite.
// Exercises the exact SQL from production preview billing review migrations.
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

export function makeFakeBillingReviewD1(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(fs.readFileSync(new URL('../../billing-migrations/0001-review-queue.sql',import.meta.url),'utf8'));
 const d1={
  sqlite,
  failWrites:false,
  prepare(sql){
   const self=this;
   return {
    bind(...args){
     const statement=sqlite.prepare(sql);
     return {
      async run(){
       if(self.failWrites)throw Error('Simulated D1 write failure');
       const result=statement.run(...args);
       return {success:true,meta:{changes:Number(result.changes||0)}};
      },
      async first(){return statement.get(...args)??null},
      async all(){return {success:true,results:statement.all(...args)}}
     };
    },
    async all(){return {success:true,results:sqlite.prepare(sql).all()}},
    async first(){return sqlite.prepare(sql).get()??null}
   };
  },
  close(){sqlite.close()}
 };
 return d1;
}
