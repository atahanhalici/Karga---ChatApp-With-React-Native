import React, { useState, useEffect } from 'react';
import { DATABASE_URL, NOTIFICATION_SERVER_URL } from '../../config';
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

    useEffect(() => {
        const userRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            if (userData) {
                setUser(userData);
    
                setFriendsCount(userData.friends ? Object.keys(userData.friends).length : 0);
                setConversationsCount(userData.conversations ? Object.keys(userData.conversations).length : 0);
                setGroupsCount(userData.groups ? Object.keys(userData.groups).length : 0);
    
                const myUserRef = firebase.app().database(DATABASE_URL).ref(`/users/${myUserId}`);

                myUserRef.on('value', mySnapshot => {
                    const myData = mySnapshot.val();

                    
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
    
                const conversationsRef = firebase.app().database(DATABASE_URL).ref(`/conversations`);
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
                .database(DATABASE_URL)
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
                .database(DATABASE_URL)
                .ref(`/users/${userId}/friendRequests/${myUserId}`);
    
            // Remove the friend request from the other user's data
            await otherUserFriendRequestsRef.remove();
    
            // Reference to the current user's sendRequests
            const myUserSendRequestsRef = firebase
                .app()
                .database(DATABASE_URL)
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

        const dbUrl = DATABASE_URL;
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
                .database(DATABASE_URL)
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
                .database(DATABASE_URL)
                .ref(`/users/${myUserId}/friendRequests/${userId}`);
    
            // Remove the friend request from the other user's data
            await otherUserFriendRequestsRef.remove();
    
            // Reference to the current user's sendRequests
            const myUserSendRequestsRef = firebase
                .app()
                .database(DATABASE_URL)
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
                .database(DATABASE_URL)
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
            .database(DATABASE_URL)
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
            .database(DATABASE_URL)
            .ref(`/users/${userId}`);

        // Update the friendRequests list with true value
        await friendRequestsRef.once('value').then(async (snapshot) => {
            const userData = snapshot.val() || {};
            const updatedFriendRequests = { ...userData.friendRequests, [myUserId]: true };

            await friendRequestsRef.update({ friendRequests: updatedFriendRequests });
        });
    
            // Get the other user's token
            const snapshot = await firebase
                .app()
                .database(DATABASE_URL)
                .ref(`/users/${userId}`)
                .once('value');
    
            const token = snapshot.val().fcmToken;
            
    
            // Send notification to the other user
            const response = await fetch(`${NOTIFICATION_SERVER_URL}/send-notification`, {
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
                        <View style={styles.friendButtons}>
                            {renderButton('Remove Friend', handleRemoveFriend, 'user-minus', '#FF8400')}
                            {renderButton('Message', handleMessagePress, 'envelope', '#FF8400')}
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
        </LinearGradient>

    );
};
const { width, height } = Dimensions.get('window');
const modalSize = Math.min(width, height) * 0.8;
const styles = StyleSheet.create({
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
