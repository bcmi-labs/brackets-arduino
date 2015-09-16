/*
  Arduino Ciao example
  
  Remember to set the xmpp client in the "USER" field where you want receive the response by MCU
 
  */
 
#include <Ciao.h>

String USER="user@domain";
String mess[5]={"Hi, I am MCU :-P","hallo , ik ben MCU :-P","bonjour, je suis MCU :-P","Ciao, io sono MCU :-P","Kon'nichiwa, watashi wa MCU yo :-P" };

void setup() {
  Ciao.begin(); 
}

void loop() {
    
  CiaoData data = Ciao.read("xmpp");  
  
  if(!data.isEmpty()){
    String id = data.get(0);
    String sender = data.get(1);
    String message = data.get(2);
    
    message.toLowerCase();
    if(message == "ciao" )
      Ciao.write("xmpp", USER,mess[random(0,5)]);
  }
}

