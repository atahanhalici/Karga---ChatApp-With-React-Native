const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const cron = require('node-cron');
const port = process.env.PORT || 3000;

const serviceAccount = require('./karga-303a6-firebase-adminsdk-qwpe7-53ed378049.json');

// Firebase Admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/',
});

// Body parser middleware kullan
app.use(bodyParser.json());

// Bildirim gönderme endpoint'i
app.post('/send-notification', (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).send({ error: 'Missing required fields' });
  }

  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
  };

  admin.messaging().send(message)
    .then(response => {
      console.log('Successfully sent message:', response);
      res.status(200).send({ success: 'Successfully sent message', response: response });
    })
    .catch(error => {
      console.error('Error sending message:', error);
      res.status(500).send({ error: 'Error sending message', details: error.message });
    });
});

let muteCrons = {}; // Store cron jobs here

app.post('/set-mute', (req, res) => {
    try {
        const { userId, settingKey, onFinish } = req.body;
        console.log("set-mute endpoint called");

        if (!userId || !settingKey || !onFinish) {
            return res.status(400).send({ error: 'Missing required fields' });
        }

        const muteEndTime = new Date(onFinish);
        console.log("Mute end time:", muteEndTime.toISOString());

        if (isNaN(muteEndTime.getTime())) {
            return res.status(400).send({ error: 'Invalid date format' });
        }

        const cronPattern = `${muteEndTime.getSeconds()} ${muteEndTime.getMinutes()} ${muteEndTime.getHours()} ${muteEndTime.getDate()} ${muteEndTime.getMonth() + 1} *`;
        console.log("Generated cron pattern:", cronPattern);

        if (muteCrons[userId]?.[settingKey]) {
            console.log("Stopping existing cron job for user:", userId, " setting:", settingKey);
            muteCrons[userId][settingKey].stop();
        }

        const task = cron.schedule(cronPattern, async () => {
            try {
                console.log(`Cron job triggered for user ${userId}, setting ${settingKey}`);
                const userRef = admin.database().ref(`users/${userId}/${settingKey}`);
                await userRef.update({
                    mute: false,
                    onFinish: null,
                    time: null,
                });
                console.log(`Mute for ${settingKey} has ended for user ${userId}`);

                delete muteCrons[userId][settingKey];
            } catch (error) {
                console.error('Error updating mute status:', error);
            }
        });

        task.start(); // Cron job'un başladığından emin ol

        if (!muteCrons[userId]) {
            muteCrons[userId] = {};
        }
        muteCrons[userId][settingKey] = task;

        res.status(200).send({ success: 'Mute cron job set successfully' });
    } catch (error) {
        console.error('Error in /set-mute:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});


app.post('/cancel-mute', (req, res) => {

    console.log("cancel-mute");
    const { userId, settingKey } = req.body;

    if (!userId || !settingKey) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    if (muteCrons[userId]?.[settingKey]) {
        muteCrons[userId][settingKey].stop();
        delete muteCrons[userId][settingKey]; // Clean up

        const userRef = admin.database().ref(`users/${userId}/${settingKey}`);
        userRef.update({
            mute: false,
            onFinish: null,
            time: null,
        })
        .then(() => {
            console.log(`Mute for ${settingKey} canceled for user ${userId}`);
            res.status(200).send({ success: 'Mute canceled successfully' });
        })
        .catch(error => {
            console.error('Error updating mute status:', error);
            res.status(500).send({ error: 'Failed to update mute status' });
        });
    } else {
        res.status(400).send({ error: 'No active mute to cancel' });
    }
});

let muteGroupCrons = {}; // Store cron jobs for group mutes

app.post('/set-group-mute', (req, res) => {
    const { userId, groupId, onFinish } = req.body;
    console.log("set-group-mute");
    if (!userId || !groupId || !onFinish) {
        console.error('Missing required fields:', { userId, groupId, onFinish });
        return res.status(400).send({ error: 'Missing required fields' });
    }

    // Calculate the mute end time
    const muteEndTime = new Date(onFinish);
    const cronPattern = `${muteEndTime.getSeconds()} ${muteEndTime.getMinutes()} ${muteEndTime.getHours()} ${muteEndTime.getDate()} ${muteEndTime.getMonth() + 1} *`;

    console.log(`Setting mute cron job with pattern: ${cronPattern}`);

    // If there's already a cron job, stop it before setting a new one
    if (muteGroupCrons[userId]?.[groupId]) {
        console.log(`Stopping existing cron job for user: ${userId}, group: ${groupId}`);
        muteGroupCrons[userId][groupId].stop();
    }

    // Schedule the new cron job
    const task = cron.schedule(cronPattern, () => {
        const groupRef = admin.database().ref(`users/${userId}/mutedGroups/${groupId}`);
groupRef
    .set({
        mute: false,
        onFinish: null,
        time: null,
    })
    .then(() => {
        console.log(`Mute for group ${groupId} has ended for user ${userId}`);
        // Cleanup after mute ends
        if (muteGroupCrons[userId]) {
            delete muteGroupCrons[userId][groupId];
            // If there are no more groups muted for this user, remove the user entry
            if (Object.keys(muteGroupCrons[userId]).length === 0) {
                delete muteGroupCrons[userId];
            }
        }
    })
    .catch((error) => {
        console.error('Error updating mute status for group:', error);
    });
    });

    // Store the cron job
    if (!muteGroupCrons[userId]) {
        muteGroupCrons[userId] = {};
    }
    muteGroupCrons[userId][groupId] = task;

    console.log(`Cron job set successfully for user: ${userId}, group: ${groupId}`);

    res.status(200).send({ success: 'Group mute cron job set successfully' });
});

// Cancel mute for a group
app.post('/cancel-group-mute', (req, res) => {
    const { userId, groupId } = req.body;
console.log("cancel-group-mute");

    if (!userId || !groupId) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    if (muteGroupCrons[userId]?.[groupId]) {
        muteGroupCrons[userId][groupId].stop();
        delete muteGroupCrons[userId][groupId]; // Clean up

        const groupRef = admin.database().ref(`users/${userId}/mutedGroups/${groupId}`);
        groupRef.update({
            mute: false,
            onFinish: null,
            time: null,
        })
        .then(() => {
            console.log(`Mute for group ${groupId} canceled for user ${userId}`);
            res.status(200).send({ success: 'Group mute canceled successfully' });
        })
        .catch(error => {
            console.error('Error updating mute status for group:', error);
            res.status(500).send({ error: 'Failed to update group mute status' });
        });
    } else {
        res.status(400).send({ error: 'No active mute to cancel for this group' });
    }
});

let muteConversationCrons = {}; // Store cron jobs for conversation mutes

app.post('/set-conversation-mute', (req, res) => {
    const { myUserId, conversationId, onFinish } = req.body;
    console.log("set-conversation-mute");
    if (!myUserId || !conversationId || !onFinish) {
        console.error('Missing required fields:', { myUserId, conversationId, onFinish });
        return res.status(400).send({ error: 'Missing required fields' });
    }

    const muteEndTime = new Date(onFinish);
    const cronPattern = `${muteEndTime.getSeconds()} ${muteEndTime.getMinutes()} ${muteEndTime.getHours()} ${muteEndTime.getDate()} ${muteEndTime.getMonth() + 1} *`;

    if (muteConversationCrons[myUserId]?.[conversationId]) {
        muteConversationCrons[myUserId][conversationId].stop();
    }

    const task = cron.schedule(cronPattern, () => {
        const conversationRef = admin.database().ref(`users/${myUserId}/mutedConversations/${conversationId}`);
        conversationRef
            .set({
                mute: false,
                onFinish: null,
                time: null,
            })
            .then(() => {
                console.log(`Mute for conversation ${conversationId} has ended for user ${myUserId}`);
                delete muteConversationCrons[myUserId][conversationId];
                if (Object.keys(muteConversationCrons[myUserId]).length === 0) {
                    delete muteConversationCrons[myUserId];
                }
            })
            .catch((error) => {
                console.error('Error updating mute status for conversation:', error);
            });
    });

    if (!muteConversationCrons[myUserId]) {
        muteConversationCrons[myUserId] = {};
    }
    muteConversationCrons[myUserId][conversationId] = task;

    res.status(200).send({ success: 'Conversation mute cron job set successfully' });
});

app.post('/cancel-conversation-mute', (req, res) => {
    const { myUserId, conversationId } = req.body;
console.log("cancel-conversation-mute");

    console.log("Received request to cancel conversation mute for:", { myUserId, conversationId });

    // Check if required fields are present
    if (!myUserId || !conversationId) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    // Safely log and check the specific cron job without triggering circular structure errors
    const cronJob = muteConversationCrons[myUserId]?.[conversationId];
    
    if (cronJob) {
        console.log(`Found cron job for myUserId: ${myUserId}, conversationId: ${conversationId}`);

        // Stop the cron job
        cronJob.stop();

        // Remove the cron job from the muteConversationCrons object
        delete muteConversationCrons[myUserId][conversationId];
        console.log(`Cron job stopped and removed for myUserId: ${myUserId}, conversationId: ${conversationId}`);

        // Update the Firebase Realtime Database
        const conversationRef = admin.database().ref(`users/${myUserId}/mutedConversations/${conversationId}`);
        conversationRef.update({
            mute: false,
            onFinish: null,
            time: null,
        })
        .then(() => {
            console.log(`Conversation mute status updated successfully in the database for myUserId: ${myUserId}, conversationId: ${conversationId}`);
            res.status(200).send({ success: 'Conversation mute canceled successfully' });
        })
        .catch(error => {
            console.error('Failed to update conversation mute status in the database:', error);
            res.status(500).send({ error: 'Failed to update conversation mute status' });
        });
    } else {
        console.error(`No active cron job found to cancel for myUserId: ${myUserId}, conversationId: ${conversationId}`);
        res.status(400).send({ error: 'No active mute to cancel for this conversation' });
    }
});


let muteInvitationCrons = {}; // Store cron jobs for invitation mutes

app.post('/set-invitation-mute', (req, res) => {
    const { myUserId, userId, onFinish } = req.body;
console.log("set-invitation-mute");

    if (!myUserId || !userId || !onFinish) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    const muteEndTime = new Date(onFinish);
    const cronPattern = `${muteEndTime.getSeconds()} ${muteEndTime.getMinutes()} ${muteEndTime.getHours()} ${muteEndTime.getDate()} ${muteEndTime.getMonth() + 1} *`;

    if (muteInvitationCrons[myUserId]?.[userId]) {
        muteInvitationCrons[myUserId][userId].stop();
    }

    const task = cron.schedule(cronPattern, () => {
        const invitationRef = admin.database().ref(`users/${myUserId}/mutedInvitations/${userId}`);
        invitationRef
            .set({
                mute: false,
                onFinish: null,
                time: null,
            })
            .then(() => {
                delete muteInvitationCrons[myUserId][userId];
                if (Object.keys(muteInvitationCrons[myUserId]).length === 0) {
                    delete muteInvitationCrons[myUserId];
                }
            })
            .catch((error) => {
                console.error('Error updating mute status for invitation:', error);
            });
    });

    if (!muteInvitationCrons[myUserId]) {
        muteInvitationCrons[myUserId] = {};
    }
    muteInvitationCrons[myUserId][userId] = task;

    res.status(200).send({ success: 'Invitation mute cron job set successfully' });
});
app.post('/cancel-invitation-mute', (req, res) => {
    const { myUserId, userId } = req.body;
console.log("cancel-invitation-mute");

    console.log("Received request to cancel invitation mute for:", { myUserId, userId });

    // Check if required fields are present
    if (!myUserId || !userId) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    // Safely log the state of the specific cron job without triggering circular structure errors
    const cronJob = muteInvitationCrons[myUserId]?.[userId];
    
    if (cronJob) {
        console.log(`Found cron job for myUserId: ${myUserId}, userId: ${userId}`);

        // Stop the cron job
        cronJob.stop();

        // Remove the cron job from the muteInvitationCrons object
        delete muteInvitationCrons[myUserId][userId];
        console.log(`Cron job stopped and removed for myUserId: ${myUserId}, userId: ${userId}`);

        // Update the Firebase Realtime Database
        const invitationRef = admin.database().ref(`users/${myUserId}/mutedInvitations/${userId}`);
        invitationRef.update({
            mute: false,
            onFinish: null,
            time: null,
        })
        .then(() => {
            console.log(`Invitation mute status updated successfully in the database for myUserId: ${myUserId}, userId: ${userId}`);
            res.status(200).send({ success: 'Invitation mute canceled successfully' });
        })
        .catch(error => {
            console.error('Failed to update invitation mute status in the database:', error);
            res.status(500).send({ error: 'Failed to update invitation mute status' });
        });
    } else {
        console.error(`No active cron job found to cancel for myUserId: ${myUserId}, userId: ${userId}`);
        res.status(400).send({ error: 'No active mute to cancel for this invitation' });
    }
});


function checkMuteStatuses() {
  const usersRef = admin.database().ref('users');

  usersRef.once('value', snapshot => {
      snapshot.forEach(userSnapshot => {
          const userId = userSnapshot.key;
          const userSettings = userSnapshot.val();

          Object.keys(userSettings).forEach(settingKey => {
              const setting = userSettings[settingKey];
              
              if (setting.mute && setting.onFinish) {
                  const timeRemaining = setting.onFinish - Date.now();
                  
                  if (timeRemaining <= 0) {
                      // Zaman dolmuş, mute durumunu false yap
                      usersRef.child(`${userId}/${settingKey}`).update({
                        mute: false,
                        onFinish:null,
                        time:null
                      }).then(() => {
                          console.log(`Mute for ${settingKey} has ended for user ${userId}`);
                      }).catch(error => {
                          console.error('Error updating mute status:', error);
                      });
                  } else {
                      // Zaman dolmamışsa yeni bir setTimeout başlat
                      setTimeout(() => {
                          usersRef.child(`${userId}/${settingKey}`).update({
                            mute: false,
                            onFinish:null,
                            time:null
                          }).then(() => {
                              console.log(`Mute for ${settingKey} has ended for user ${userId}`);
                          }).catch(error => {
                              console.error('Error updating mute status:', error);
                          });
                      }, timeRemaining);
                  }
              }
          });
      });
  });
}

app.listen(port, () => {
console.log(`Server is running on port ${port}`);
checkMuteStatuses(); // Sunucu başlatıldığında kontrol fonksiyonunu çalıştır
});