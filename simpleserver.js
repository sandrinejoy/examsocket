const WebSocket = require('ws').Server;
const wss = new WebSocket({ port: process.env.PORT || 9090 });
const log = (a) => console.log(a);
log(process.env.PORT);
let users = {}
wss.on('connection', (client) =>{
  client.on('message',(data) =>{
      msg = JSON.parse(data)
      if(msg.to == "SERVER"){
        for_server(client, msg);
    }
    if(msg.to == "CLIENT"){
        for_client(client, msg);
    }
    if(msg.to == "PROCTOR"){
        for_proctor(client, msg);
    }

  });
  client.on('close',() =>{
    try{
        userid = client.credentials.user.id;
        exm_id = client.credentials.exam;

        con = users[exm_id][userid];
        delete users[exm_id][userid];

        if(users[exm_id].PROCTOR){
                proctor_conn =users[exm_id].PROCTOR;
                newpayload = {
                    type : "STUDENTDISCONNECTED",
                    student_conn : con
                }
                proctor_conn.send(JSON.stringify(newpayload));
            }
        console.log(userid + " Disconnected");
        }
    catch(err){
        client.close();
        console.log("Connection Closed");

      }
  });
  client.on('error',(err) =>{
    client.close();
    log("Oops ! something wrong happened")
  });
});

const for_server = (client , payload) =>{
    user = payload.user
    exam = payload.exam
    if(!users[exam]){
        users[exam] = {};
    }
    if(payload.type == 'STUDENTJOIN'){
        if(!users[exam][user.id]){
              wsObj = client
              wsObj.credentials = { 
                  user :user,
                  exam :exam
            };
            users[exam][user.id] = wsObj
            log(user.id + "Joined")
            if(users[exam].PROCTOR){
                proctorWsObj = users[exam].PROCTOR;
                joinPayload ={
                    type : "STUDENTJOINED",
                    student_conn : client 
                }
                proctorWsObj.send(JSON.stringify(joinPayload))
                //RTC OFFER REQ
                client.send(JSON.stringify({
                    type : "MAKEOFFER"
                }));
            }
          //  console.table(users[exam][user.id].credentials)
        }
        else{
            log(user.id +" is already present from somewhere else")
            client.close();
        }

    }
    else if(payload.type == 'PROCTORJOIN'){
        if(!users[exam].PROCTOR){
                wsObj = client
                wsObj.credentials = { 
                    user :user,
                    exam :exam
              };
              users[exam][user.id] = wsObj
              log("Proctor Joined")   
             // console.table(users[exam][user.id].credentials)
            }
        else{
            log("Proctor is already present from somewhere else")
            client.close();
        }


    }
}
const for_proctor = (client , payload) =>{
    if(payload.type == "OFFER"){
        exm_id = payload.exam;
        if(users[exm_id].PROCTOR){
            proctor_conn = users[exm_id].PROCTOR;
            proctor_conn.send(JSON.stringify(payload));
        }
    }
    if(payload.type=="NEWICE"){
        exm_id = payload.user.exam_id;
        if(users[exm_id].PROCTOR){
           
            proctor_conn = users[exm_id].PROCTOR;
            proctor_conn.send(JSON.stringify(payload));
        }
    }
}
// const for_client = (client , message) =>{
//     payload = message
//     switch(payload.type){
//         case "ANSWER":{
//             exam=payload.exam
//             if(users[payload.exam][payload.user.id]){
//                 student_conn = users[payload.exam][payload.user.id]
//                 student_conn.send(JSON.stringify(payload))
//                 log("ANSWER TO STUDENT-" + student_conn.credentials.user.id);
//             }
//         }
//         case "CANDIATE":{
//             exam_id = client.credentials.exam
//             console.log(payload)
//             usr = users[exam_id][payload.id].credentials.user;
//             load = {
//                 from : "PROCTOR",
//                 to : "CLIENT",
//                 type: "CANDIDATE",
//                 user : usr,
//                 exam : exam_id,
//                 candidate : payload.candidate
//             }
            
//             student_conn = users[exam_id][usr.id]
//             student_conn.send(JSON.stringify(load))
//             log("CANDIDATE MESSAGE TO STUDENT-" + student_conn.credentials.user.id);
//             break;
//         }
        
//     }
    
// }

function for_client(connection, message){
    console.log("Recieved a msg to client .Type : ",message.type)
    payload = message;
    if(payload.type=="NEWICE"){
        exm_id = payload.user.exam;
        student= payload.student;
        if(users[exm_id][student]){
            student_conn = users[exm_id][student];
            student_conn.send(JSON.stringify(payload));
        }
    }
    if(payload.type == "ANSWER"){
       exm_id = payload.exam;
        if(users[payload.exam][payload.user.id]){
            client_conn = users[payload.exam][payload.user.id]
            client_conn.send(JSON.stringify(payload));
            console.log("ANSWER TO CLIENT" + client_conn.credentials.user.id);
        }
    }
   
}
log("Server is on")