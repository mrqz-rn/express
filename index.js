const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./database'); // Import MySQL connection
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // required for form data


app.post('/api/login', (req, res) => {
    const data = req.body;
    const {username, password} = data;
    const query = `SELECT * FROM spott_db.users WHERE username = ?`;
    db.query(query, [username], (err, data) => {
        if (err) {
            return res.status(500).json(
                { status: false, error: err.message }
            );
        }
        if(data.length === 0){
            return res.status(200).json({ status: false, error: 'Username not found' });
        }else{
            if(data[0].password !== password){
                return res.status(200).json({ status: false, error: 'Invalid password' });
            }else{
                const update = `UPDATE spott_db.users SET last_login = NOW() WHERE username = ?`;
                db.query(update, [username]);
                let result = {
                    status: true,
                    data: data
                }
                res.json(result);
            }
        }
    })
})


app.put('/api/savelogs', (req, res) => {
    const data = req.body;
    const {user_id, date, time, type, latitude, longitude} = data;
    const insert_query = `INSERT INTO spott_db.att_logs (user_id, date, time, type, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(insert_query, [user_id, date, time, type, latitude, longitude], (err, data) => {
        if (err) {
            return res.status(500).json(
                { status: false, error: err.message }
            );
        }
        let result = {
            status: true,
            insert_id: data.insertId,
            data: {
                user_id: user_id,
                date: date,
                time: time,
                type: type,
                latitude: latitude,
                longitude: longitude
            }
        }
        res.json(result);
    })
})







app.get('/api/masterselect', (req, res) => {
    const data = req.body;
    const {database, table, fields, filter, having, find} = data;

    const validateInput = (input) => {
        const regex = /^[a-zA-Z0-9_,]+$/;
        return regex.test(input);
    };

    if (!validateInput(database) || !validateInput(table)) {
        return res.status(400).json({ error: 'Invalid database or table name' });
    }

    let selection = '';
    if(fields){
        if(!validateInput(fields)){
            return res.status(400).json({ error: 'Invalid field name' });
        }else{
            selection = fields;
        }
    }else{
        selection = '*';
    }

    let query = `SELECT ${selection} FROM ${database}.${table}`;

    const whereClauses = [];
    const whereValues = [];
    if(filter){
        Object.entries(filter).forEach(([key, value]) => {
            whereClauses.push(`\`${key}\` = ?`);
            whereValues.push(value);
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
    }
    
    const havingClauses = [];
    const havingValues = [];
    if(having){
        Object.entries(having).forEach(([key, value]) => {
            havingClauses.push(`\`${key}\` = ?`);
            havingValues.push(value);
        });
        if (havingClauses.length > 0) {
            query += ` HAVING ${havingClauses.join(' AND ')}`;
        }
    }

    const findClauses = [];
    const findValues = [];
    if(find){
        Object.entries(find).forEach(([key, value]) => {
            findClauses.push(`FIND_IN_SET(\`${key}\` , ?`);
            findValues.push(value);
        });
        if (findClauses.length > 0) {
            query += ` OR ${findClauses.join(' AND ')})`;
        }
    }


    const combinedValues = [...whereValues, ...havingValues, ...findValues];
    console.log(query, combinedValues)
    db.query(query, combinedValues, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});





// Example route: add user
app.post('/api/users', (req, res) => {
    const data = req.body;
    const database = data.database;
    const table = data.table;
    let query = `SELECT * FROM ${database}.${table}`;
    db.query(query, (err, data) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(data);
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
