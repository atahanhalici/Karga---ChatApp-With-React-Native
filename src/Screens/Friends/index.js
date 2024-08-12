import React, { useState, useEffect,useCallback  } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator, FlatList,TextInput } from 'react-native';
import firebase from '@react-native-firebase/app';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import _ from 'lodash'; // Import lodash for debouncing
const Friends = () => {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [friends, setFriends] = useState([]);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('My Friends');
    const userId = firebase.auth().currentUser.uid;
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    useEffect(() => {
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            
            setUser(userData);
            if (userData) {
                if (userData.friends) {
                    fetchFriendsData(userData.friends);
                }
                
                if (userData.friendRequests) {
                    fetchPendingInvitationsData(userData.friendRequests);
                } else {
                    setPendingInvitations([]); // Ensure pendingInvitations is reset if there are no requests
                    setLoading(false);
                }
            }
        });
    
        return () => userRef.off();
    }, [userId]);
    const fetchFriendsData = (friendsIds) => {
        const friendsRefs = friendsIds.map(friendId => 
            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${friendId}`)
        );

        const handleFriendChange = (friendId, snapshot) => {
            const friendData = { userId: friendId, ...snapshot.val() };
            setFriends(prevFriends => {
                const updatedFriends = prevFriends.map(friend =>
                    friend.userId === friendId ? friendData : friend
                );
                if (!updatedFriends.some(friend => friend.userId === friendId)) {
                    updatedFriends.push(friendData);
                }
                return updatedFriends;
            });
        };

        friendsRefs.forEach(friendRef => {
            friendRef.on('value', snapshot => handleFriendChange(friendRef.key, snapshot));
        });

        setLoading(false);

        return () => {
            friendsRefs.forEach(friendRef => friendRef.off());
        };
    };
    const searchUsers = useCallback(_.debounce((query) => {
        const usersRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/users');
        usersRef.once('value', snapshot => {
            const usersData = snapshot.val();
    
            const results = usersData ? Object.keys(usersData).map(id => ({ userId: id, ...usersData[id] })) : [];
            
            const filteredResults = results.filter(otherUser => 
                otherUser.userId !== userId && // Exclude current user's data
                otherUser.userName.toLowerCase().includes(query.toLowerCase())
            );
    
            setSearchResults(filteredResults);
            setSearchLoading(false); 
        });
    }, 500), []);
    

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        setSearchLoading(true);
        searchUsers(searchQuery);
    }, [searchQuery, searchUsers]);
    const fetchPendingInvitationsData = (requestsObject) => {
        const requestIds = requestsObject ? Object.keys(requestsObject) : [];
    
        const requestsRefs = requestIds.map(requestId => 
            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${requestId}`)
        );
    
        const handleRequestChange = (requestId, snapshot) => {
            const requestData = { userId: requestId, ...snapshot.val() };
            setPendingInvitations(prevRequests => {
                const updatedRequests = prevRequests.map(request =>
                    request.userId === requestId ? requestData : request
                );
                if (!updatedRequests.some(request => request.userId === requestId)) {
                    updatedRequests.push(requestData);
                }
                return updatedRequests;
            });
        };
    
        requestsRefs.forEach(requestRef => {
            requestRef.on('value', snapshot => handleRequestChange(requestRef.key, snapshot));
        });
    
        setLoading(false);
    
        return () => {
            requestsRefs.forEach(requestRef => requestRef.off());
        };
    };

        // Function to add a friend
        const handleAddFriend =async (friendId) => {
            try {
                console.log('Sending friend request...');
        
                // Reference to the other user's notifications in the database
                const otherUserRef = firebase
                    .app()
                    .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`/users/${friendId}/notifications`);
        
                // Push a new friend request notification
                await otherUserRef.push().set({
                    notificationType: "friend",
                    senderId: userId,
                    senderName: firebase.auth().currentUser.displayName,
                });
        
                // Add otherUserId to the sendRequests list in the current user's data
                const myUserRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${userId}`);
    
            // Update the sendRequests list with true value
            await myUserRef.once('value').then(async (snapshot) => {
                const userData = snapshot.val() || {};
                const updatedSendRequests = { ...userData.sendRequests, [friendId]: true };
    
                await myUserRef.update({ sendRequests: updatedSendRequests });
            });
    
            // Reference to the other user's friendRequests
            const friendRequestsRef = firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`/users/${friendId}`);
    
            // Update the friendRequests list with true value
            await friendRequestsRef.once('value').then(async (snapshot) => {
                const userData = snapshot.val() || {};
                const updatedFriendRequests = { ...userData.friendRequests, [userId]: true };
    
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
            const isInvitationMuted = userData.mutedInvitations?.[userId]?.mute;
        
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
    
        // Function to remove a friend
        const handleRemoveFriend = (friendId) => {

        };
    
        // Function to remove a sent friend request
        const handleRemoveRequest = async (friendId) => {
            try {
                console.log('Removing friend request...');
        
                // Reference to the other user's notifications
                const otherUserNotificationsRef = firebase
                    .app()
                    .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`/users/${friendId}/notifications`);
        
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
                    .ref(`/users/${friendId}/friendRequests/${userId}`);
        
                // Remove the friend request from the other user's data
                await otherUserFriendRequestsRef.remove();
        
                // Reference to the current user's sendRequests
                const myUserSendRequestsRef = firebase
                    .app()
                    .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`/users/${userId}/sendRequests/${friendId}`);
        
                // Remove the send request from the current user's data
                await myUserSendRequestsRef.remove();
        
                console.log('Friend request removed successfully');
            } catch (error) {
                console.error('Error removing friend request:', error);
            }
        };
    
        // Function to accept a friend request
        const handleAcceptRequest = async(friendId) => {
            console.log('Accepting friend request...');

            const dbUrl = 'https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/';
            const userRefs = firebase.app().database(dbUrl).ref(`/users/${userId}/notifications`);
        
            await userRefs.once('value').then(async (snapshot) => {
                const notifications = snapshot.val() || {};
                const updates = {};
                
                for (const key in notifications) {
                    if (notifications[key].senderId === friendId) {
                        updates[key] = null; // Delete the matching notification
                    }
                }
        
                if (Object.keys(updates).length > 0) {
                    await userRefs.update(updates);
                }
            });
        
            const userRef = firebase.app().database(dbUrl).ref(`/users/${userId}`);
            const senderRef = firebase.app().database(dbUrl).ref(`/users/${friendId}`);
            
            const userSnapshot = await userRef.once('value');
            const senderSnapshot = await senderRef.once('value');
            
            const userData = userSnapshot.val() || {};
            const senderData = senderSnapshot.val() || {};
            
            const userFriends = userData.friends || [];
            const senderFriends = senderData.friends || [];
        
            // Add friends if not already added
            if (!userFriends.includes(friendId)) {
                userFriends.push(friendId);
                await userRef.update({ friends: userFriends });
            }
        
            if (!senderFriends.includes(userId)) {
                senderFriends.push(userId);
                await senderRef.update({ friends: senderFriends });
            }
        
            // Remove senderId from userRef's friendRequests
            const userFriendRequests = userData.friendRequests || {};
            if (userFriendRequests[friendId]) {
                delete userFriendRequests[friendId];
                await userRef.update({ friendRequests: userFriendRequests });
            }
        
            // Remove userId from senderRef's senderRequests
            const senderRequests = senderData.sendRequests || {};
            if (senderRequests[userId]) {
                delete senderRequests[userId];
                await senderRef.update({ sendRequests: senderRequests });
            }
            setPendingInvitations((prevRequests) => prevRequests.filter(request => request.userId !== friendId));
        };
    
        // Function to reject a friend request
        const handleRejectRequest = async(friendId) => {
            console.log('Declining friend request...');

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
                        if (notifications[key].senderId === friendId) {
                            await otherUserNotificationsRef.child(key).remove();
                            break;
                        }
                    }
                });
        
                // Reference to the other user's friendRequests
                const otherUserFriendRequestsRef = firebase
                    .app()
                    .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`/users/${userId}/friendRequests/${friendId}`);
        
                // Remove the friend request from the other user's data
                await otherUserFriendRequestsRef.remove();
        
                // Reference to the current user's sendRequests
                const myUserSendRequestsRef = firebase
                    .app()
                    .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`/users/${friendId}/sendRequests/${userId}`);
        
                // Remove the send request from the current user's data
                await myUserSendRequestsRef.remove();
                setPendingInvitations((prevRequests) => prevRequests.filter(request => request.userId !== friendId));
                console.log('Friend request removed successfully');
            } catch (error) {
                console.error('Error removing friend request:', error);
            }
        };
    const renderContent = () => {
        if (selectedTab === 'My Friends') {
            if (friends.length === 0) {
                return  <View style={{flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#fff',}}>
                <Image
                  source={require('../../../assets/images/logo_yazisiz.png')}
                  style={{width: 300,  // Logo genişliği
                    height: 300, // Logo yüksekliği
                    opacity:0.4
                    }}
                    resizeMode="contain"
                />
                <Text style={styles.placeholderText}>You have no friends yet. Start adding friends!</Text>
              </View>;
                
                
                
            }
            return (
                <FlatList
                    data={friends}
                    keyExtractor={(item) => item.userId}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => { navigation.navigate("UserDetails", { userId: item.userId }); }}
                        >
                            <Image
                                source={{ uri: item.picture }}
                                style={styles.profileImage}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title} numberOfLines={1} ellipsizeMode='tail'>{item.userName}</Text>
                                <Text style={styles.bio} numberOfLines={2} ellipsizeMode='tail'>{item.bio}</Text>
                            </View>
                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleRemoveFriend(item.userId) }}>
                                <Icon name="user-minus" size={10} color='#FF8400' style={styles.buttonIcon} />
                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Remove Friend"}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />
            );
        } else if (selectedTab === 'Pending Invitations') {
            if (pendingInvitations.length === 0) {
                return  <View style={{flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#fff',}}>
                <Image
                  source={require('../../../assets/images/logo_yazisiz.png')}
                  style={{width: 300,  // Logo genişliği
                    height: 300, // Logo yüksekliği
                    opacity:0.4
                    }}
                    resizeMode="contain"
                />
                <Text style={styles.placeholderText}>No pending invitations.</Text>
              </View>
            }
            return (
                <FlatList
                    data={pendingInvitations}
                    keyExtractor={(item) => item.userId}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => { navigation.navigate("UserDetails", { userId: item.userId }); }}
                        >
                            <Image
                                source={{ uri: item.picture }}
                                style={styles.profileImage}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title} numberOfLines={1} ellipsizeMode='tail'>{item.userName}</Text>
                                <Text style={styles.bio} numberOfLines={2} ellipsizeMode='tail'>{item.bio}</Text>
                            </View>
                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleRejectRequest(item.userId) }}>
                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Reject"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => { handleAcceptRequest(item.userId)}}>
                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Accept"}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />
            );
        } else if (selectedTab === 'Add Friend') {
            return (
                <View>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by username"
                            placeholderTextColor="#FF8400"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchLoading && (
                            <ActivityIndicator style={styles.searchLoading} size="small" color="#FF8400" />
                        )}
                    </View>
                    {searchQuery.trim() === '' ? (
                        <Text style={styles.placeholderText}>You can search by entering a username.</Text>
                    ) : searchResults.length > 0 ? (
                       <View style={{alignItems:'center'}}><FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.userId}
                            renderItem={({ item }) => {
                                const isFriend = friends.some(friend => friend.userId === item.userId);
                                const hasSentRequest = user.sendRequests && user.sendRequests[item.userId];
                                const hasReceivedRequest = pendingInvitations.some(request => request.userId === item.userId);
    
                                return (
                                    <TouchableOpacity
                                        style={styles.item}
                                        onPress={() => { navigation.navigate("UserDetails", { userId: item.userId }); }}
                                    >
                                        <Image
                                            source={{ uri: item.picture }}
                                            style={styles.profileImage}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.title} numberOfLines={1} ellipsizeMode='tail'>{item.userName}</Text>
                                            <Text style={styles.bio} numberOfLines={2} ellipsizeMode='tail'>{item.bio}</Text>
                                        </View>
                                        {isFriend ? (
                                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleRemoveFriend(item.userId) }}>
                                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Remove Friend"}</Text>
                                            </TouchableOpacity>
                                        ) : hasSentRequest ? (
                                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => { handleRemoveRequest(item.userId)}}>
                                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Remove Request"}</Text>
                                            </TouchableOpacity>
                                        ) : hasReceivedRequest ? (
                                            <>
                                                <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleRejectRequest(item.userId) }}>
                                                    <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Reject"}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleAcceptRequest(item.userId) }}>
                                                    <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Accept"}</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <TouchableOpacity style={[styles.outlinedButton, { borderColor: '#FF8400' }]} onPress={() => {handleAddFriend(item.userId) }}>
                                                <Text style={[styles.buttonText, { color: '#FF8400' }]}>{"Add Friend"}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        /></View>
                    ) : (
                        <Text style={styles.placeholderText}>No users found.</Text>
                    )}
                </View>
            );
        }
    };
    
    
    
    if (loading) {
        return (
            <LinearGradient
            style={styles.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0 }}
            colors={['#FF8400', '#FFA500']}
        >
            <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                    <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                </View>
            </View>
            <View style={styles.container}>
            <View style={styles.indicator}>
                <ActivityIndicator size="large" color="#FF8400" />
            </View>
            </View>
        </LinearGradient>
            
        );
    }

    return (
        <LinearGradient
            style={styles.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0 }}
            colors={['#FF8400', '#FFA500']}
        >
            <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                    <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                </View>
            </View>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'My Friends' && styles.activeTab]}
                        onPress={() => setSelectedTab('My Friends')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'My Friends' && styles.activeTabText]}>My Friends</Text>
                        {selectedTab === 'My Friends' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'Pending Invitations' && styles.activeTab]}
                        onPress={() => setSelectedTab('Pending Invitations')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'Pending Invitations' && styles.activeTabText]}>Pending Invitations</Text>
                        {selectedTab === 'Pending Invitations' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'Add Friend' && styles.activeTab]}
                        onPress={() => setSelectedTab('Add Friend')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'Add Friend' && styles.activeTabText]}>Search User</Text>
                        {selectedTab === 'Add Friend' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                </View>
                {renderContent()}
            </View>
        </LinearGradient>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#FF8400',
        borderRadius: 20,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        width:Dimensions.get('window').width - 20
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: '#FF8400',
    },
    searchLoading: {
        marginLeft: 10,
    },
    outlinedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    buttonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 10,
    },
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: Dimensions.get('window').width - 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black',
    },
    bio: {
        fontSize: 14,
        color: 'black',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    background: {
        flex: 1,
    },
    indicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        alignItems: 'center',
        paddingTop: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 10,
    },
    tab: {
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'grey',
    },
    activeTab: {
        borderBottomWidth: 1,
        borderBottomColor: '#FF8400',
    },
    activeTabText: {
        color: '#FF8400',
    },
    tabUnderline: {
        height: 1,
        backgroundColor: '#FF8400',
        width: '100%',
        marginTop: 5,
    },
    placeholderText: {
        fontSize: 18,
        color: 'grey',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default Friends;
