import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import firebase from '@react-native-firebase/app';
import database from '@react-native-firebase/database';
import { format } from 'date-fns';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import storage from '@react-native-firebase/storage';
import LinearGradient from 'react-native-linear-gradient';

const UserDetails = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [myUser, setMyUser] = useState(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [conversationsCount, setConversationsCount] = useState(0);
    const [groupsCount, setGroupsCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const { userId } = route.params;
    const myUserId = firebase.auth().currentUser.uid;
    const [relationshipStatus, setRelationshipStatus] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [mediaUrls, setMediaUrls] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [visibleMediaCount, setVisibleMediaCount] = useState(10);
    const [showMedias, setShowMedias] = useState(false);
    const [muteModalVisible, setMuteModalVisible] = useState(false);
    const [selectedInviteDuration, handleInviteDurationPress] = useState(null);
    const [selectedMessageDuration, handleMessageDurationPress] = useState(null);
    useEffect(() => {
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            if (userData) {
                setUser(userData);
    
                setFriendsCount(userData.friends ? Object.keys(userData.friends).length : 0);
                setConversationsCount(userData.conversations ? Object.keys(userData.conversations).length : 0);
                setGroupsCount(userData.groups ? Object.keys(userData.groups).length : 0);
    
                const myUserRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${myUserId}`);

                myUserRef.on('value', mySnapshot => {
                    const myData = mySnapshot.val();
                    setMyUser(myData)

                    
                    if (myData) {
                        if (myData.sendRequests && myData.sendRequests[userId]) {
                            setRelationshipStatus('sent');
                        } else if (myData.friends && myData.friends.includes(userId)) {
                            setRelationshipStatus('friend');
                        } else if (myData.friendRequests && myData.friendRequests[userId]) {
                            setRelationshipStatus('received');
                        } else {
                            setRelationshipStatus('none');
                        }
                    }
                });
    
                const conversationsRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations`);
                conversationsRef.once('value', conversationsSnapshot => {
                    const conversationsData = conversationsSnapshot.val();
                    if (conversationsData) {
                        for (const [conversationId, conversation] of Object.entries(conversationsData)) {
                            if (conversation.members && conversation.members.includes(userId) && conversation.members.includes(myUserId)) {
                               
                                
                                setConversationId(conversationId);
                                break;
                            }
                        }
                    }
                });
            } else {
                setUser(null);
            }
        });
    
        return () => userRef.off();
    }, [userId]);

    useEffect(() => {
        const fetchMediaUrls = async () => {
            if (conversationId) {
                try {
                    const mediaRef = storage().ref(`conversations/${conversationId}`);
                    const result = await mediaRef.listAll();
                    const urls = await Promise.all(result.items.map(item => item.getDownloadURL()));
                    setMediaUrls(urls);
                    if(urls.length!=0){
                        setShowMedias(true);
                    }

                } catch (error) {
                    console.error('Error fetching media URLs:', error);
                }
            }
        };

        fetchMediaUrls();
    }, [conversationId]);

    const loadMoreMedia = () => {
        setVisibleMediaCount(prevCount => prevCount + 10);
    };

  

    const renderMediaImages = () => (
        <View style={{flexDirection:'row'}}>
            <View style={{flex:1}}></View>
             <View>
            <View style={styles.mediaContainer}>
            {mediaUrls.slice(0, visibleMediaCount).map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.mediaImage} />
            ))}
            
        </View>
            {visibleMediaCount < mediaUrls.length && (
                <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreMedia}>
                    <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
            )}
        </View>
        <View style={{flex:1}}></View>
        </View>
       
        
    );

    if (!user) {
        return (
            <View style={styles.indicator}>
                <Text>User not found</Text>
                <ActivityIndicator size="large" color="#FF8400" />
            </View>
        );
    }

    const handleImagePress = () => {
        setModalVisible(true);
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return format(date, 'dd MMMM yyyy');
    };

    const handleRemoveRequest = async () => {
        try {
            console.log('Removing friend request...');
    
            // Reference to the other user's notifications
            const otherUserNotificationsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${userId}/notifications`);
    
            // Find and remove the specific notification
            await otherUserNotificationsRef.once('value', async (snapshot) => {
                const notifications = snapshot.val() || {};
                for (const key in notifications) {
                    if (notifications[key].senderId === myUserId) {
                        await otherUserNotificationsRef.child(key).remove();
                        break;
                    }
                }
            });
    
            // Reference to the other user's friendRequests
            const otherUserFriendRequestsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${userId}/friendRequests/${myUserId}`);
    
            // Remove the friend request from the other user's data
            await otherUserFriendRequestsRef.remove();
    
            // Reference to the current user's sendRequests
            const myUserSendRequestsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${myUserId}/sendRequests/${userId}`);
    
            // Remove the send request from the current user's data
            await myUserSendRequestsRef.remove();
    
            console.log('Friend request removed successfully');
        } catch (error) {
            console.error('Error removing friend request:', error);
        }
    };

    const handleRemoveFriend = () => {
        console.log('Removing friend...');
    };

    const handleAcceptRequest = async() => {
        console.log('Accepting friend request...');

        const dbUrl = 'https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/';
        const userRefs = firebase.app().database(dbUrl).ref(`/users/${myUserId}/notifications`);
    
        await userRefs.once('value').then(async (snapshot) => {
            const notifications = snapshot.val() || {};
            const updates = {};
            
            for (const key in notifications) {
                if (notifications[key].senderId === userId) {
                    updates[key] = null; // Delete the matching notification
                }
            }
    
            if (Object.keys(updates).length > 0) {
                await userRefs.update(updates);
            }
        });
    
        const userRef = firebase.app().database(dbUrl).ref(`/users/${myUserId}`);
        const senderRef = firebase.app().database(dbUrl).ref(`/users/${userId}`);
        
        const userSnapshot = await userRef.once('value');
        const senderSnapshot = await senderRef.once('value');
        
        const userData = userSnapshot.val() || {};
        const senderData = senderSnapshot.val() || {};
        
        const userFriends = userData.friends || [];
        const senderFriends = senderData.friends || [];
    
        // Add friends if not already added
        if (!userFriends.includes(userId)) {
            userFriends.push(userId);
            await userRef.update({ friends: userFriends });
        }
    
        if (!senderFriends.includes(myUserId)) {
            senderFriends.push(myUserId);
            await senderRef.update({ friends: senderFriends });
        }
    
        // Remove senderId from userRef's friendRequests
        const userFriendRequests = userData.friendRequests || {};
        if (userFriendRequests[userId]) {
            delete userFriendRequests[userId];
            await userRef.update({ friendRequests: userFriendRequests });
        }
    
        // Remove userId from senderRef's senderRequests
        const senderRequests = senderData.sendRequests || {};
        if (senderRequests[myUserId]) {
            delete senderRequests[myUserId];
            await senderRef.update({ sendRequests: senderRequests });
        }
    };

    const handleDeclineRequest =async () => {
        console.log('Declining friend request...');

        try {
            console.log('Removing friend request...');
    
            // Reference to the other user's notifications
            const otherUserNotificationsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${myUserId}/notifications`);
    
            // Find and remove the specific notification
            await otherUserNotificationsRef.once('value', async (snapshot) => {
                const notifications = snapshot.val() || {};
                for (const key in notifications) {
                    if (notifications[key].senderId === userId) {
                        await otherUserNotificationsRef.child(key).remove();
                        break;
                    }
                }
            });
    
            // Reference to the other user's friendRequests
            const otherUserFriendRequestsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${myUserId}/friendRequests/${userId}`);
    
            // Remove the friend request from the other user's data
            await otherUserFriendRequestsRef.remove();
    
            // Reference to the current user's sendRequests
            const myUserSendRequestsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${userId}/sendRequests/${myUserId}`);
    
            // Remove the send request from the current user's data
            await myUserSendRequestsRef.remove();
    
            console.log('Friend request removed successfully');
        } catch (error) {
            console.error('Error removing friend request:', error);
        }
    };

    const handleAddFriend = async () => {
        try {
            console.log('Sending friend request...');
    
            // Reference to the other user's notifications in the database
            const otherUserRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${userId}/notifications`);
    
            // Push a new friend request notification
            await otherUserRef.push().set({
                notificationType: "friend",
                senderId: myUserId,
                senderName: firebase.auth().currentUser.displayName,
            });
    
            // Add otherUserId to the sendRequests list in the current user's data
            const myUserRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`/users/${myUserId}`);

        // Update the sendRequests list with true value
        await myUserRef.once('value').then(async (snapshot) => {
            const userData = snapshot.val() || {};
            const updatedSendRequests = { ...userData.sendRequests, [userId]: true };

            await myUserRef.update({ sendRequests: updatedSendRequests });
        });

        // Reference to the other user's friendRequests
        const friendRequestsRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`/users/${userId}`);

        // Update the friendRequests list with true value
        await friendRequestsRef.once('value').then(async (snapshot) => {
            const userData = snapshot.val() || {};
            const updatedFriendRequests = { ...userData.friendRequests, [myUserId]: true };

            await friendRequestsRef.update({ friendRequests: updatedFriendRequests });
        });
    
        const snapshot = await firebase
        .app()
        .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
        .ref(`/users/${friendId}`)
        .once('value');
    
    const userData = snapshot.val();
    let token = null;
    
    if (userData) {
        const isMuteAllNotifications = userData.muteAllNotifications?.mute;
        const isMuteFriendInvitations = userData.muteFriendInvitations?.mute;
        const isInvitationMuted = userData.mutedInvitations?.[friendId]?.mute;
    
        // Eğer muteAllNotifications, muteFriendInvitations veya mutedInvitations içinde mute true değilse token'i alıyoruz
        if (!isMuteAllNotifications && !isMuteFriendInvitations && !isInvitationMuted) {
            token = userData.fcmToken;
        }
    }
            
    
            // Send notification to the other user
            const response = await fetch('http://172.20.10.2:3000/send-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    title: 'Arkadaşlık Daveti',
                    body: `${firebase.auth().currentUser.displayName} size arkadaşlık daveti yolladı`,
                }),
            });
    
            const data = await response.json();
            console.log('Notification sent successfully:', data);
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    };
    

    const handleMessagePress = () => {
        navigation.popToTop();
        navigation.navigate('Chat', { conversationId, name: user.userName });
    };

    const renderButton = (title, onPress, iconName, color) => (
        <TouchableOpacity style={[styles.outlinedButton, { borderColor: color }]} onPress={onPress}>
            <Icon name={iconName} size={20} color={color} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color }]}>{title}</Text>
        </TouchableOpacity>
    );

    const handleMuteModal=()=>{
        setMuteModalVisible(true);
    }
    const handleMutePress = async () => {
        if (!selectedMessageDuration && !selectedInviteDuration) {
          Alert.alert('Duration not selected', "Please select a duration for either messages or invitations.");
          return;
        }
      
        const userRef = firebase
          .app()
          .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
          .ref(`users/${myUserId}`);
      
        const updates = {};
      
        // Handle muting for messages
        if (selectedMessageDuration) {
          const messageRef = userRef.child('mutedConversations');
      
          if (selectedMessageDuration !== "All Mute") {
            const serverTime = new Date().getTime();
           // const onFinish = serverTime + selectedMessageDuration * 60 * 60 * 1000;
            const onFinish = serverTime + 15 * 1000; // Convert hours to milliseconds
            updates[conversationId] = {
              onFinish: onFinish,
              mute: true,
              time: selectedMessageDuration,
            };
      
            try {
              await messageRef.update(updates);
              await fetch('http://172.20.10.2:3000/set-conversation-mute', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  myUserId,
                  conversationId,
                  onFinish: onFinish,
                }),
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to mute the conversation');
            }
          } else {
            updates[conversationId] = {
              mute: true,
              onFinish: null,
              time: null,
            };
            await messageRef.update(updates);
          }
        }
      
        if (selectedInviteDuration) {
            const inviteRef = userRef.child(`mutedInvitations/${userId}`);
          
            if (selectedInviteDuration !== "All Mute") {
              const serverTime = new Date().getTime();
              const onFinish = serverTime + selectedInviteDuration * 60 * 60 * 1000;
             // const onFinish = serverTime + 5 * 1000; // Convert hours to milliseconds
              const inviteUpdate = {
                onFinish: onFinish,
                mute: true,
                time: selectedInviteDuration,
              };
          
              try {
                await inviteRef.update(inviteUpdate);
                await fetch('http://172.20.10.2:3000/set-invitation-mute', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    myUserId,
                    userId,
                    onFinish: onFinish,
                  }),
                });
              } catch (error) {
                Alert.alert('Error', 'Failed to mute the invitations from this friend');
              }
            } else {
              const inviteUpdate = {
                mute: true,
                onFinish: null,
                time: null,
              };
              await inviteRef.update(inviteUpdate);
            }
          }
      
        setMuteModalVisible(false);
        handleMessageDurationPress(null);
        handleInviteDurationPress(null);
      };
      
      const handleUnmuteInvitations = async () => {
        const userRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`users/${myUserId}/mutedInvitations`);
    
        try {
            const snapshot = await userRef.once('value');
            const mutedInvitations = snapshot.val();
            
            if (mutedInvitations) {
                for (const userId of Object.keys(mutedInvitations)) {
                    const { mute, time } = mutedInvitations[userId];
    
                    if (mute === true && time === undefined) {
                        const invitationRef = firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`users/${myUserId}/mutedInvitations/${userId}`);
                        
                        await invitationRef.update({
                            mute: false,
                            onFinish: null,
                            time: null,
                        });
                    } else {
                        await fetch('http://172.20.10.2:3000/cancel-invitation-mute', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                myUserId,
                                userId,
                            }),
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching muted invitations:', error);
        }
    };

    const handleUnmuteMessages = async () => {
        const userRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`users/${myUserId}/mutedConversations`);
        console.log("sa");
    
        try {
            const snapshot = await userRef.once('value');
            const mutedConversations = snapshot.val();
            
            if (mutedConversations) {
                for (const conversationId of Object.keys(mutedConversations)) {
                    const { mute, time } = mutedConversations[conversationId];
                    
    
                    if (mute === true && time === undefined) {
                        console.log("Updating mute status for conversation:", conversationId);
                        
                        const conversationRef = firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`users/${myUserId}/mutedConversations/${conversationId}`);
                        
                        await conversationRef.update({
                            mute: false,
                            onFinish: null,
                            time: null,
                        });
                    } else {
                        console.log("Canceling mute for conversation:", conversationId);
                        
                        await fetch('http://172.20.10.2:3000/cancel-conversation-mute', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                myUserId,
                                conversationId,
                            }),
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching muted conversations:', error);
        }
    };
    
    return (

        <LinearGradient
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0 }}
        colors={['#FF8400', '#FFA500']}
    >
        <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
            <View style={[styles.header]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={25} color="white" />
        </TouchableOpacity>
            <View style={{flex:1}}></View>
            <Image style={{width:35,height:35,marginRight:10}} source={require('../../../assets/images/logo_icon.png')}></Image>
                <Text style={styles.title}>Karga</Text>
                
            </View>
        </View>
        <View style={{
            backgroundColor: 'white',
            flex: 1,
            borderTopRightRadius: 30,
            borderTopLeftRadius: 30,
            alignItems: 'center',
            paddingTop: 20,
        }}>
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.contentContainer}>
                <View style={styles.profileContainer}>
                    <TouchableOpacity onPress={handleImagePress}>
                        <Image source={{ uri: user.picture }} style={styles.profilePicture} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.username}>{user.userName}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                <Text style={styles.joinDate}>Join Date: {formatDate(user.createTime)}</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{friendsCount}</Text>
                        <Text style={styles.statLabel}>Friends</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{conversationsCount}</Text>
                        <Text style={styles.statLabel}>Conversations</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{groupsCount}</Text>
                        <Text style={styles.statLabel}>Groups</Text>
                    </View>
                </View>
                <View style={styles.buttonsContainer}>
                    {relationshipStatus === 'sent' && renderButton('Remove Request', handleRemoveRequest, 'times', '#FF8400')}
                    {relationshipStatus === 'friend' && (
                        <View style={{alignItems:'center'}}>
                        <View style={styles.friendButtons}>
                            {renderButton('Remove Friend', handleRemoveFriend, 'user-minus', '#FF8400')}
                            {renderButton('Message', handleMessagePress, 'envelope', '#FF8400')}
                        </View>
                        <View style={{height:10}}/>
                        <View style={{flexDirection:'row',alignItems:'center'}}>
                        <View style={styles.friendButtons}>
                            <View style={{flex:1}}/>
                            {myUser.mutedConversations[conversationId]?.mute === false || myUser.mutedInvitations[userId]?.mute === false? (
    renderButton('Mute Friend', handleMuteModal, 'bell-slash', '#FF8400')
  ) : (
    renderButton('Unmute Friend', ()=>{}, 'bell', '#FF8400')
  )}
                       
                        <View style={{flex:1}}/>
                    </View>
                        </View>
                       </View>
                    )}
                    {relationshipStatus === 'received' && (
                        <View style={styles.friendButtons}>
                            {renderButton('Accept', handleAcceptRequest, 'check', '#FF8400')}
                            {renderButton('Decline', handleDeclineRequest, 'times', '#FF8400')}
                        </View>
                    )}
                    {relationshipStatus === 'none' && renderButton('Add Friend', handleAddFriend, 'user-plus', '#FF8400')}
                </View>
                {showMedias && (
    <TouchableOpacity style={styles.mediaButton} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.mediaButtonText}>{expanded ? 'Hide Media' : 'Show Media'}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#FF8400" />
    </TouchableOpacity>
)}

                {expanded && renderMediaImages()}
            </View>
        </ScrollView>
        <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalBackground}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContainer}>
                                <Image source={{ uri: user.picture }} style={styles.modalImage} />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
        <Modal
  visible={muteModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => {
    setMuteModalVisible(false);
    handleMessageDurationPress(null);
    handleInviteDurationPress(null);
  }}
>
  <TouchableWithoutFeedback
    onPress={() => {
      setMuteModalVisible(false);
      handleMessageDurationPress(null);
      handleInviteDurationPress(null);
    }}
  >
    <View style={styles.modalBackground}>
      <TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          {/* Mesajlar için seçenekler */}
          {myUser && myUser.mutedConversations && myUser.mutedConversations[conversationId]?.mute === false && (
    <View>
        <Text style={styles.sectionTitle}>For Messages From This User:</Text>
        <View style={styles.durationButtons}>
            {[1, 5, 10, 24, "All Mute"].map((duration) => (
                <TouchableOpacity
                    key={`message-${duration}`}
                    onPress={() => handleMessageDurationPress(duration)}
                    style={[
                        styles.durationButton,
                        selectedMessageDuration === duration && styles.selectedDurationButton,
                    ]}
                >
                    <Text
                        style={[
                            styles.durationButtonText,
                            selectedMessageDuration === duration && styles.selectedDurationButtonText,
                        ]}
                    >
                        {duration === "All Mute" ? duration : `${duration} Saat`}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
)}
          {myUser && myUser.mutedConversations && myUser.mutedConversations[conversationId]?.mute !== false &&(
           <View>
           <Text style={styles.sectionTitle}>For Messages From This User:</Text>
           <TouchableOpacity onPress={handleUnmuteMessages}>
               <View style={[styles.muteButton, { alignItems: 'center', justifyContent: 'center', flexDirection: 'column',marginBottom:10 }]}>
                   <Text style={[styles.muteButtonText, { textAlign: 'center' }]}>
                       Unmute for Messages
                   </Text>
               </View>
           </TouchableOpacity>
       </View>
             
          )}

          {/* Davetler için seçenekler */}
          {myUser && myUser.mutedInvitations && myUser.mutedInvitations[userId]?.mute === false && (
            <View>
<Text style={styles.sectionTitle}>For Invitations From This User:</Text>
          <View style={styles.durationButtons}>
            {[1, 5, 10, 24, "All Mute"].map((duration) => (
              <TouchableOpacity
                key={`invite-${duration}`}
                onPress={() => handleInviteDurationPress(duration)}
                style={[
                  styles.durationButton,
                  selectedInviteDuration === duration && styles.selectedDurationButton,
                ]}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedInviteDuration === duration && styles.selectedDurationButtonText,
                  ]}
                >
                  {duration === "All Mute" ? duration : `${duration} Saat`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
            </View>
          
          )}

{myUser && myUser.mutedInvitations && myUser.mutedInvitations[userId]?.mute !== false &&(
         <View>
         <Text style={styles.sectionTitle}>For Invitations From This User:</Text>
         <TouchableOpacity onPress={handleUnmuteInvitations}>
             <View style={[styles.muteButton, { alignItems: 'center', justifyContent: 'center', flexDirection: 'column',marginBottom:10 }]}>
                 <Text style={[styles.muteButtonText, { textAlign: 'center' }]}>
                     Unmute for Invitations
                 </Text>
             </View>
         </TouchableOpacity>
     </View>
     
             
          )}
          {/* Mute Butonu */}
          {myUser && myUser.mutedInvitations && myUser.mutedConversations && 
(myUser.mutedInvitations[userId]?.mute === false || myUser.mutedConversations[conversationId]?.mute === false) && (
          <TouchableOpacity onPress={handleMutePress}>
            <View style={styles.muteButton}>
              <Text style={styles.muteButtonText}>Mute</Text>
            </View>
          </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>
        </LinearGradient>

    );
};
const { width, height } = Dimensions.get('window');
const modalSize = Math.min(width, height) * 0.8;
const styles = StyleSheet.create({
    sectionTitle:{
marginBottom:10,fontWeight:'bold',textAlign:'center'
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        width: '80%',
        maxHeight: '60%',
    },
    durationOptionsText: {
        fontSize: 16,
        color: '#4B4B4B',
        marginBottom: 10,
    },
    durationButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 10,
        marginTop: 5,
        width: Dimensions.get('window').width - 100,
    },
    durationButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FF8400',
        backgroundColor: 'white',
        marginHorizontal: 5,
        marginVertical: 5,
    },
    selectedDurationButton: {
        backgroundColor: '#FF8400',
    },
    durationButtonText: {
        color: '#FF8400',
        fontWeight: 'bold',
    },
    selectedDurationButtonText: {
        color: 'white',
    },
    muteButton: {
        backgroundColor: '#FF8400',
        borderRadius: 20,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        width: Dimensions.get('window').width - 150,
    },
    muteButtonText: {
        color: 'white',
    },
    background: {
        flex: 1,
    },
    indicator:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header:{
        flexDirection:'row',
        alignItems:'center',
    },
    contentContainer: {
        padding: 20,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profilePicture: {
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    bio: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    joinDate: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
        width:'100%'
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    divider: {
        height: 40,
        width: 1,
        backgroundColor: '#ccc',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    friendButtons: {
        flexDirection: 'row',
    },
    outlinedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 10,
    },
    mediaButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    mediaButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF8400',
        marginRight: 10,
    },
    mediaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaImage: {
        width: 100,
        height: 100,
        margin: 5,
        borderRadius: 5,
    },
    loadMoreButton: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FF8400',
        borderRadius: 5,
    },
    loadMoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContainer: {
        width: modalSize,
        height: modalSize,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: modalSize / 2,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: modalSize / 2,
    },
    title: { fontSize: 27, fontWeight: '800', color: 'white' },
});

export default UserDetails;
