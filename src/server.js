import express from 'express';
import dotenv from 'dotenv';
import { sql } from '../config/db.js';
import ratelimiter from '../middleware/rateLimiter.js';
dotenv.config();


 const app = express();
const PORT = process.env.PORT ;
// app.use(ratelimiter)
app.use(express.json());


async function initDB(){
    try{
        await sql`CREATE TABLE IF NOT EXISTS transactions(
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL, 
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`
        console.log("Database connected and table created successfully");
 
    }catch(error){
        console.error("Error connecting to the database:", error);
        process.exit(1); // Exit the process with failure
    }
}

app.get('/api/transactions/:userId', async (req, res) => {
    try {
         const { userId } = req.params;
      const transaction=   await sql`SELECT * FROM transactions WHERE user_id= ${userId} ORDER BY created_at DESC`

      res.status(200).json(transaction);



    } catch (error) {
          console.error("Error getting the transaction:", error);
        res.status(500).json({ error: 'Internal server error' });
        
    }
   

})


app.delete('/api/transactions/:id', async (req, res) => {
    try {   
         const { id } = req.params;
if ( isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid transaction ID' });
        }

      const result=   await sql`DELETE FROM transactions WHERE id= ${id} RETURNING *`
        if (result.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }


      res.status(200).json({ message: 'Transaction deleted successfully', transaction: result[0] });
      


    } catch (error) {
          console.error("Error Deleting the transaction:", error);
        res.status(500).json({ error: 'Internal server error' });
        
    }
   

})


 app.post('/api/transactions',async (req,res)=>{
    try {
        const {title, amount, category, user_id} = req.body;
        if (!title || amount===undefined || !category || !user_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }
     const transaction =   await sql`
        INSERT INTO transactions (user_id, title, amount, category)
        VALUES (${user_id}, ${title}, ${amount}, ${category})
        RETURNING *;
        `;
        console.log(transaction); 
        res.status(201).json(transaction[0]);


        
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: 'Internal server error' });
        
    }

     
 })


 app.get('/api/transactions/summary/:userId', async (req, res) => {
    try {
         const { userId } = req.params;
      const balanceResult = await sql`SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${userId}`;
      const incomeResult = await sql`SELECT COALESCE(SUM(amount), 0) AS income FROM transactions WHERE user_id = ${userId} AND amount > 0`;
        const expenseResult = await sql`SELECT COALESCE(SUM(amount), 0) AS expense FROM transactions WHERE user_id = ${userId} AND amount < 0`;  

res.status(200).json({
            balance: balanceResult[0].balance,
            income: incomeResult[0].income,
            expense: expenseResult[0].expense
        });

    } catch (error) {
          console.error("Error getting the summary transaction:", error);
        res.status(500).json({ error: 'Internal server error' });
        
    }
   

})

initDB().then(() => {
     app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
 }) 
}
)