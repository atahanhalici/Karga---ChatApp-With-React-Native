import React, { useState, useEffect } from 'react';
import { DATABASE_URL, NOTIFICATION_SERVER_URL } from '../../config';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback,Alert,Button } from 'react-native';
import firebase from '@react-native-firebase/app';
import database from '@react-native-firebase/database';
import * as ImagePicker from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import { format } from 'date-fns';;
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import storage from '@react-native-firebase/storage';
import LinearGradient from 'react-native-linear-gradient';
import { FlatList, TextInput } from 'react-native-gesture-handler';
const GroupDetails = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { groupId } = route.params;
    const [group, setGroup] = useState(null);
    const [user, setUser] = useState(null);
    const [membersCount, setMembersCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [mediaUrls, setMediaUrls] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [visibleMediaCount, setVisibleMediaCount] = useState(10);
    const [showMedias, setShowMedias] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [transferred, setTransferred] = useState(0);
    const userId = firebase.auth().currentUser.uid;
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [myDirector, setMyDirector] = useState(false);
    const [friendModalVisible, setFriendModalVisible] = useState(false);
    const [groupNameVisible, setGroupNameVisible] = useState(false);
    const [groupDescVisible, setGroupDescVisible] = useState(false);
    const [friends, setFriends] = useState([]); // Store friends data
    const [description, setDescription] = useState("");
    const [groupName, setGroupName] = useState("");

    const saveNewDescription = () => {
        if (description !== group.description) {
            firebase.app().database(DATABASE_URL)
                .ref(`/groups/${groupId}`)
                .update({ description })
                .then(() => {
                    // Handle successful update (e.g., show a confirmation message, close the modal, etc.)
                    setGroupDescVisible(false);
                })
                .catch(error => {
                    // Handle error (e.g., show an error message)
                    console.error('Error updating description:', error);
                });
        } else {
            // If description hasn't changed, just close the modal
            setGroupDescVisible(false);
        }
    };
    const saveNewGroupName = () => {
        if (groupName !== group.name) {
            firebase.app().database(DATABASE_URL)
                .ref(`/groups/${groupId}`)
                .update({ name:groupName })
                .then(() => {
                    // Handle successful update (e.g., show a confirmation message, close the modal, etc.)
                    setGroupNameVisible(false);
                })
                .catch(error => {
                    // Handle error (e.g., show an error message)
                    console.error('Error updating description:', error);
                });
        } else {
            // If description hasn't changed, just close the modal
            setGroupNameVisible(false);
        }
    };
    useEffect(() => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}`);
    
        const handleGroupData = snapshot => {
            const groupData = snapshot.val();
            if (groupData) {
                setGroup(groupData);
                setDescription(groupData.description || "");
                setGroupName(groupData.name || "");
                setMembersCount(groupData.members ? groupData.members.length : 0);
                setMessagesCount(groupData.messages ? Object.keys(groupData.messages).length : 0);
    
                // Get all member IDs including author and directors
                const authorId = groupData.author;
                const directorIds = groupData.directors || [];
                const memberIds = groupData.members || [];
                
                const allMemberIds = Array.from(new Set([authorId, ...directorIds, ...memberIds]));
    
                const memberRefs = allMemberIds.map(memberId =>
                    firebase
                        .app()
                        .database(DATABASE_URL)
                        .ref(`/users/${memberId}`)
                );
    
                const onValueChange = snapshot => {
                    const userData = snapshot.val();
                    const userId = snapshot.key;
    
                    setMembers(prevMembers => {
                        let updatedMembers = prevMembers.filter(member => member.userId !== userId);
                        if (userData) {
                            updatedMembers.push({
                                userId,
                                userName: userData.userName,
                                picture: userData.picture,
                                online: userData.online,
                                bio: userData.bio,
                                conversations: userData.conversations,
                            });
                        }
    
                        // Sort members: author first, then directors (online first), then members (online first)
                        updatedMembers.sort((a, b) => {
                            if (a.userId === authorId) return -1;
                            if (b.userId === authorId) return 1;
                            if (directorIds.includes(a.userId) && !directorIds.includes(b.userId)) return -1;
                            if (!directorIds.includes(a.userId) && directorIds.includes(b.userId)) return 1;
                            if (directorIds.includes(a.userId) && directorIds.includes(b.userId)) {
                                return b.online - a.online; // Online directors first
                            }
                            if (!directorIds.includes(a.userId) && !directorIds.includes(b.userId)) {
                                return b.online - a.online; // Online members first
                            }
                            return 0;
                        });
    
                        return updatedMembers;
                    });
                };
    
                // Clear previous listeners
                memberRefs.forEach(memberRef => {
                    memberRef.off('value', onValueChange);
                });
    
                // Set new listeners
                setMembers([]);  // Reset members before adding new ones
                memberRefs.forEach(memberRef => {
                    memberRef.on('value', onValueChange);
                });
    
                // Remove all listeners on cleanup
                return () => {
                    memberRefs.forEach(memberRef => {
                        memberRef.off('value', onValueChange);
                    });
                };
            } else {
                setGroup(null);
                setDescription(""); // Reset description if no data
                setGroupName("");
                setMembers([]);
            }
        };
    
        groupRef.on('value', handleGroupData);
    
        return () => groupRef.off('value', handleGroupData);
    }, [groupId]);
    
    

    useEffect(() => {
        const userRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}`);
        
        const handleUserData = snapshot => {
            const userData = snapshot.val();
            if (userData) {
                setUser(userData);
            } else {
                setUser(null);
            }
        };

        userRef.on('value', handleUserData);

        return () => userRef.off('value', handleUserData);
    }, [userId]);

    useEffect(() => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/directors`);
    
        const handleDirectorsChange = snapshot => {
            const directors = snapshot.val() || [];
            setMyDirector(directors.includes(userId));
        };
    
        groupRef.on('value', handleDirectorsChange);
    
        return () => groupRef.off('value', handleDirectorsChange);
    }, [groupId, userId]);

    useEffect(() => {
      }, [members]);
    
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentItems = members.slice(startIndex, endIndex);
    
      const totalPages = Math.ceil(members.length / itemsPerPage);
    
      const handleMemberPress = (item) => {
        setSelectedMember(item);
        setMemberModalVisible(true);
      };
    
      const handleNextPage = () => {
        if (currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
        }
      };
    
      const handlePrevPage = () => {
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      };
    useEffect(() => {
        const fetchMediaUrls = async () => {
            if (groupId) {
                try {
                    const mediaRef = storage().ref(`groups/${groupId}`);
                    const result = await mediaRef.listAll();
                    const urls = await Promise.all(result.items.map(item => item.getDownloadURL()));
                    setMediaUrls(urls);
                    if(urls.length !== 0){
                        setShowMedias(true);
                    }
                } catch (error) {
                    console.error('Error fetching media URLs:', error);
                }
            }
        };

        fetchMediaUrls();
    }, [groupId]);

    const loadMoreMedia = () => {
        setVisibleMediaCount(prevCount => prevCount + 10);
    };

    const renderMediaImages = () => (
        <View style={{flexDirection: 'row'}}>
            <View style={{flex: 1}}></View>
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
            <View style={{flex: 1}}></View>
        </View>
    );

    if (!group) {
        return (
            <View style={styles.indicator}>
                <Text>Group not found</Text>
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

    const renderButton = (title, onPress, iconName, color) => (
        <TouchableOpacity style={[styles.outlinedButton, { borderColor: color }]} onPress={onPress}>
            <Icon name={iconName} size={20} color={color} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color }]}>{title}</Text>
        </TouchableOpacity>
    );

    const handleEditPress = () => {
        setEditModalVisible(true);
    };

    const handleMembersPress = () => {
        setIsModalVisible(true);
    };
    const selectImage = () => {
        ImageCropPicker.openPicker({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            setEditModalVisible(false);
        });
    };
    
    const takePhoto = () => {
        ImageCropPicker.openCamera({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            setEditModalVisible(false);
        });
    };

    const uploadImage = async (uri) => {
        if (!uri) {
            setEditModalVisible(false);
            return;
        }
    
        const uploadUri = uri;
        const filename = `${groupId}.jpg`;  // Consistent naming convention using groupId
        const folderPath = 'group_pictures';
        const filePath = `${folderPath}/${filename}`;
    
        setEditModalVisible(false);
        setUploading(true);
        setTransferred(0);
    
        // Delete the old group picture if it exists
        if (group && group.picture  && group.picture.includes(group.id)) {
            const oldPictureRef = storage().refFromURL(group.picture);
            try {
                await oldPictureRef.delete();
            } catch (error) {
            }
        }
        
    
        const task = storage()
            .ref(filePath)
            .putFile(uploadUri);
    
        // Set transferred state
        task.on('state_changed', snapshot => {
            setTransferred(
                Math.round(snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
        });
    
        try {
            await task;
    
            const url = await storage().ref(filePath).getDownloadURL();
            setGroup(prevState => ({ ...prevState, picture: url }));
            firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}`).update({
                picture: url,
            });
    
            Alert.alert(
                "Success",
                "Group photo has been successfully changed",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            // Optional: Additional actions on success
                        }
                    }
                ],
            );
        } catch (e) {
            console.error(e);
        } finally {
            setUploading(false);
            setEditModalVisible(false);
        }
    };

    const renderButtons = () => {
        const isOwner = group.author === userId;
const isAdmin = group.directors && group.directors.includes(userId);
const isMember = group.members && group.members.includes(userId);
        if (selectedMember?.userId === userId) {
            return (
                <>
                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={handleLeaveGroup}
                    >
                        <Text style={styles.buttonText}>Leave the Group</Text>
                    </TouchableOpacity>
                    {group.directors.includes(selectedMember?.userId) && !isOwner&&(
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={handleLeaveAdminRole}
                        >
                            <Text style={styles.buttonText}>Leave Admin Role</Text>
                        </TouchableOpacity>
                    )}
                </>
            );
        }
    

    
        if (isOwner) {
            return (
                <>
                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={() => handleRemoveFromGroup(selectedMember?.userId)}
                    >
                        <Text style={styles.buttonText}>Remove from Group</Text>
                    </TouchableOpacity>
                    {selectedMember?.userId !== userId && !group.directors.includes(selectedMember?.userId) && (
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={() => handleMakeAdmin(selectedMember?.userId)}
                        >
                            <Text style={styles.buttonText}>Make Admin</Text>
                        </TouchableOpacity>
                    )}
                    {selectedMember?.userId !== userId && group.directors.includes(selectedMember?.userId) && (
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={() => handleRemoveAdmin(selectedMember?.userId)}
                        >
                            <Text style={styles.buttonText}>Remove Admin</Text>
                        </TouchableOpacity>
                    )}
                    {selectedMember?.userId !== userId && (
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={() => handleTransferOwnership(selectedMember?.userId)}
                        >
                            <Text style={styles.buttonText}>Transfer Ownership</Text>
                        </TouchableOpacity>
                    )}
                </>
            );
        } else if (isAdmin) {
            if (selectedMember?.userId !== group.author) {
                return (
                    <>
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={() => handleRemoveFromGroup(selectedMember?.userId)}
                        >
                            <Text style={styles.buttonText}>Remove from Group</Text>
                        </TouchableOpacity>
                        {selectedMember?.userId !== userId && !group.directors.includes(selectedMember?.userId) && (
        <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleMakeAdmin(selectedMember?.userId)}
        >
            <Text style={styles.buttonText}>Make Admin</Text>
        </TouchableOpacity>
    )}
    
    {selectedMember?.userId !== userId && group.directors.includes(selectedMember?.userId) && (
        <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleRemoveAdmin(selectedMember?.userId)}
        >
            <Text style={styles.buttonText}>Remove Admin</Text>
        </TouchableOpacity>
    )}
                    </>
                );
            }else{
                null
            }
           
        } else if (isMember) {
            return (
                null
            );
        }
    
        return null;
    };
    const handleLeaveGroup = () => {
        const isOwner = group.author === userId;
        const isDirector = group.directors && group.directors.includes(userId);
        const isMember = group.members && group.members.includes(userId);
    
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}`);
        const userStatusRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/userStatus/${userId}`);
        const userGroupsRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}/groups/${groupId}`);
        setMemberModalVisible(false);
    
        const removeFromArray = (ref, userId) => {
            return ref.once('value')
                .then(snapshot => {
                    const array = snapshot.val();
                    if (array && Array.isArray(array)) {
                        const index = array.indexOf(userId);
                        if (index > -1) {
                            array.splice(index, 1);
                            return ref.set(array);
                        }
                    }
                    return Promise.resolve();
                });
        };
    
        const tasks = [];
    
        if (isOwner) {
            const directors = group.directors || [];
            const members = group.members || [];
            
            if (directors.length === 1) {
                // Only one director (which is the owner), make a random member both owner and director
                const remainingMembers = members.filter(member => member !== userId);
                if (remainingMembers.length > 0) {
                    const newOwnerId = remainingMembers[Math.floor(Math.random() * remainingMembers.length)];
                    tasks.push(
                        groupRef.child('author').set(newOwnerId)
                            .then(() => console.log(`User ${newOwnerId} set as new owner.`))
                            .catch(error => console.error(`Error setting new owner:`, error))
                    );
                    tasks.push(
                        groupRef.child('directors').set([newOwnerId])
                            .then(() => console.log(`User ${newOwnerId} set as new director.`))
                            .catch(error => console.error(`Error setting new director:`, error))
                    );
                }
            } else if (directors.length === 2) {
                // Two directors, make the other director the owner
                const otherDirector = directors.find(director => director !== userId);
                tasks.push(
                    groupRef.child('author').set(otherDirector)
                        .then(() => console.log(`User ${otherDirector} set as new owner.`))
                        .catch(error => console.error(`Error setting new owner:`, error))
                );
            } else if (directors.length > 2) {
                // More than two directors, choose one randomly as the new owner
                const remainingDirectors = directors.filter(director => director !== userId);
                const newOwnerId = remainingDirectors[Math.floor(Math.random() * remainingDirectors.length)];
                tasks.push(
                    groupRef.child('author').set(newOwnerId)
                        .then(() => console.log(`User ${newOwnerId} set as new owner.`))
                        .catch(error => console.error(`Error setting new owner:`, error))
                );
            }
        }
    
        if (isDirector) {
            tasks.push(
                removeFromArray(groupRef.child('directors'), userId)
                    .then(() => console.log(`User ${userId} removed from directors.`))
                    .catch(error => console.error(`Error removing user ${userId} from directors:`, error))
            );
        }
    
        if (isMember || isOwner) {
            tasks.push(
                removeFromArray(groupRef.child('members'), userId)
                    .then(() => console.log(`User ${userId} removed from members.`))
                    .catch(error => console.error(`Error removing user ${userId} from members:`, error))
            );
        }
    
        tasks.push(
            userStatusRef.remove()
                .then(() => console.log(`User status for ${userId} removed.`))
                .catch((error) => console.error(`Error removing user status for ${userId}:`, error))
        );
    
        tasks.push(
            userGroupsRef.remove()
                .then(() => console.log(`User ${userId} removed from group ${groupId} in user data.`))
                .catch((error) => console.error(`Error removing user from group ${groupId} in user data:`, error))
        );
    
        Promise.all(tasks).then(() => {
            console.log(`All tasks for removing user ${userId} completed.`);
        });
    };
    
    const handleRemoveFromGroup = (userId) => {
        const isAdmin = group.directors && group.directors.includes(userId);
        const isMember = group.members && group.members.includes(userId);
    
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}`);
        const userStatusRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/userStatus/${userId}`);
        const userGroupsRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}/groups/${groupId}`);
        setIsModalVisible(false);
        setMemberModalVisible(false); 
    
        navigation.popToTop();
    
        const removeFromArray = (ref, userId) => {
            return ref.once('value')
                .then(snapshot => {
                    const array = snapshot.val();
                    if (array && Array.isArray(array)) {
                        const index = array.indexOf(userId);
                        if (index > -1) {
                            array.splice(index, 1);
                            return ref.set(array);
                        }
                    }
                    return Promise.resolve();
                });
        };
    
        const tasks = [];
    
        if (isAdmin) {
            tasks.push(
                removeFromArray(groupRef.child('directors'), userId)
                    .then(() => console.log(`User ${userId} removed from directors.`))
                    .catch(error => console.error(`Error removing user ${userId} from directors:`, error))
            );
    
            tasks.push(
                removeFromArray(groupRef.child('members'), userId)
                    .then(() => console.log(`User ${userId} removed from members.`))
                    .catch(error => console.error(`Error removing user ${userId} from members:`, error))
            );
        } else if (isMember) {
            tasks.push(
                removeFromArray(groupRef.child('members'), userId)
                    .then(() => console.log(`User ${userId} removed from members.`))
                    .catch(error => console.error(`Error removing user ${userId} from members:`, error))
            );
        }
    
        tasks.push(
            userStatusRef.remove()
                .then(() => console.log(`User status for ${userId} removed.`))
                .catch((error) => console.error(`Error removing user status for ${userId}:`, error))
        );
    
        tasks.push(
            userGroupsRef.remove()
                .then(() => console.log(`User ${userId} removed from group ${groupId} in user data.`))
                .catch((error) => console.error(`Error removing user from group ${groupId} in user data:`, error))
        );
    
        Promise.all(tasks).then(() => {
            console.log(`All tasks for removing user ${userId} completed.`);  

        
            
          
        });

    };
    
    
    const handleGoToProfile = (userId) => {
        setIsModalVisible(false);
        setMemberModalVisible(false);
        navigation.navigate("UserDetails", { userId: userId });
    };
    
    const handleMessage = (otherUserId, name, conversations) => {
        // Convert both objects' keys to arrays of conversation IDs
        const userConversationIds = Object.keys(user.conversations);
        const conversationIds = Object.keys(conversations);
  
        if(!user.friends ||!user.friends.includes(otherUserId)){
            Alert.alert(
                'Warning',
                'You need to visit the user\'s profile and add them as a friend before messaging.',
                [{ text: 'OK' }]
              );
              return;
        }
    
        // Find common conversation ID
        const commonConversationId = conversationIds.find(id => userConversationIds.includes(id));
    
        if (commonConversationId) {
            setIsModalVisible(false);
            setMemberModalVisible(false);
            navigation.popToTop();
            navigation.navigate('Chat', { conversationId: commonConversationId, name });
        } else {
            // Handle the case where no common conversation is found
            console.log('No common conversation found');
        }
    };
    
    const handleMakeAdmin = (userId) => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/directors`);
setMemberModalVisible(false);
        groupRef.once('value')
            .then((snapshot) => {
                let directors = snapshot.val();
                if (directors) {
                    // If directors is an array, add the userId to the array
                    if (Array.isArray(directors)) {
                        if (!directors.includes(userId)) {
                            directors.push(userId);
                        } else {
                            console.log(`User ${userId} is already a director.`);
                            return;
                        }
                    } else {
                        // Handle the case where directors is not an array (should not happen if data is consistent)
                        directors = [userId];
                    }
                } else {
                    // If directors does not exist, initialize it as an array with the userId
                    directors = [userId];
                }
    
                return groupRef.set(directors);
            })
            .then(() => {
                console.log(`User ${userId} added to directors.`);
            })
            .catch((error) => {
                console.error(`Error adding user ${userId} to directors:`, error);
            });
    };
    
    const handleRemoveAdmin = (userId) => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/directors`);
        setMemberModalVisible(false);
        groupRef.once('value')
            .then((snapshot) => {
                let directors = snapshot.val();
                if (directors && Array.isArray(directors)) {
                    const index = directors.indexOf(userId);
                    if (index !== -1) {
                        directors.splice(index, 1); // Remove the userId from the array
                        return groupRef.set(directors);
                    } else {
                        console.log(`User ${userId} is not in directors.`);
                        return;
                    }
                } else {
                    console.log('Directors list is empty or not an array.');
                    return;
                }
            })
            .then(() => {
                console.log(`User ${userId} removed from directors.`);
            })
            .catch((error) => {
                console.error(`Error removing user ${userId} from directors:`, error);
            });
    };

    const handleLeaveAdminRole = () => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}/directors`);
        setMemberModalVisible(false);
        groupRef.once('value')
            .then((snapshot) => {
                let directors = snapshot.val();
                if (directors && Array.isArray(directors)) {
                    const index = directors.indexOf(userId);
                    if (index !== -1) {
                        directors.splice(index, 1); // Remove the userId from the array
                        return groupRef.set(directors);
                    } else {
                        console.log(`User ${userId} is not in directors.`);
                        return;
                    }
                } else {
                    console.log('Directors list is empty or not an array.');
                    return;
                }
            })
            .then(() => {
                console.log(`User ${userId} removed from directors.`);
            })
            .catch((error) => {
                console.error(`Error removing user ${userId} from directors:`, error);
            });
    };
    const handleTransferOwnership = (id) => {
        const groupRef = firebase.app().database(DATABASE_URL).ref(`/groups/${groupId}`);
        const directorsRef = groupRef.child('directors');
        const authorRef = groupRef.child('author');
        setMemberModalVisible(false);
        // Remove current userId from author and set new author
        authorRef.once('value')
            .then((snapshot) => {
                const currentAuthor = snapshot.val();
                if (currentAuthor === userId) {
                    return authorRef.set(id);
                } else {
                    console.log(`Current author is not ${userId}.`);
                    return Promise.reject(`Current author is not ${userId}.`);
                }
            })
            .then(() => {
                console.log(`Ownership transferred to user ${id}.`);
    
                // Check and update directors list
                return directorsRef.once('value');
            })
            .then((snapshot) => {
                let directors = snapshot.val();
                if (directors) {
                    if (Array.isArray(directors)) {
                        if (!directors.includes(id)) {
                            directors.push(id);
                        } else {
                            console.log(`User ${id} is already a director.`);
                            return;
                        }
                    } else {
                        directors = [id];
                    }
                } else {
                    directors = [id];
                }
    
                return directorsRef.set(directors);
            })
            .then(() => {
                console.log(`User ${id} added to directors.`);
            })
            .catch((error) => {
                console.error(`Error transferring ownership or updating directors:`, error);
            });
    };
    const handleAddToGroup=async(id)=>{
        const otherUserRef = firebase.app().database(DATABASE_URL).ref(`/users/${id}/notifications`);
        await otherUserRef.push().set({
            notificationType: "group",
            id: groupId,
            senderName: firebase.auth().currentUser.displayName,
            name: group.name,
            senderId:userId
        });

        const otherUserSnapshot = await firebase.app().database(DATABASE_URL).ref(`users/${id}`).once('value');
        const otherUserData = otherUserSnapshot.val();
       const token = otherUserData.fcmToken;
       // fetch('http://192.168.0.23:3000/send-notification', {
          //  fetch('http://192.168.50.47:3000/send-notification', {
            fetch(`${NOTIFICATION_SERVER_URL}/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                title: `Grup Daveti`,
                body: `${firebase.auth().currentUser.displayName} sizi ${group.name} adlı gruba davet etti`
            })
        }).then(response => response.json())
            .then(data => {

            }).catch(error => {

            });
setFriendModalVisible(false);
setIsModalVisible(true);
    }
    const renderItem = ({ item, group, handleMemberPress, styles }) => {
        const isOwner = group.author === item.userId;
        const isAdmin = group.directors && group.directors.includes(item.userId);
      
        return (
          <TouchableOpacity
            style={styles.item}
            onPress={() => handleMemberPress(item)}
          >
            <Image source={{ uri: item.picture }} style={styles.profileImage} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.titles}>{item.userName}</Text>
                {isAdmin && !isOwner && <Icon name="user-cog" size={16} color="#FF8400" style={{ marginLeft: 10 }} />}
                {isOwner && <Icon name="crown" size={16} color="#FF8400" style={{ marginLeft: 10 }} />}
              </View>
              <Text style={styles.name}>{item.bio}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View
              style={[styles.dot, { backgroundColor: item.online ? 'green' : 'red' }]}
            />
          </TouchableOpacity>
        );
      };

      const handleAddMemberPress = async () => {
        try {
            // Fetch the friend IDs
            const friendsRef = firebase
                .app()
                .database(DATABASE_URL)
                .ref(`/users/${userId}/friends`);
    
            const snapshot = await friendsRef.once('value');
            const friendIds = snapshot.val();
    
            // Prepare an array to store friend details
            const friendsData = [];
    
            // Fetch details for each friend ID
            for (const friendId of friendIds) {
                const friendRef = firebase
                    .app()
                    .database(DATABASE_URL)
                    .ref(`/users/${friendId}`);
    
                const friendSnapshot = await friendRef.once('value');
                const friendData = friendSnapshot.val();
    
                if (friendData) {
                    friendsData.push({
                        userId: friendId,
                        userName: friendData.userName,
                        bio: friendData.bio,
                        picture: friendData.picture,
                    });
                }
            }
    
            // Update the state with the fetched friends data
            setFriends(friendsData);
            setFriendModalVisible(true);
    
        } catch (error) {
            console.error('Error fetching friends data: ', error);
        }
    };
    const renderFriendItem = ({ item }) => {
        const isMember = group.members.includes(item.userId);
        setMemberModalVisible
        return (
            <TouchableOpacity
                style={[styles.item,{width:Dimensions.get('window').width*0.8-40}]}
                onPress={() => {
                    setFriendModalVisible(false);
                    setIsModalVisible(false);
                    navigation.navigate("UserDetails", { userId: item.userId })

                }}
            >
                <Image source={{ uri: item.picture }} style={{width: 35,
     height: 35,
     borderRadius: 25,
     marginRight: 15,}} />
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{fontSize: 17,
     fontWeight: '700',
     color: 'black'}} numberOfLines={1}
                        ellipsizeMode="tail">{item.userName}</Text>
                    <Text
                        style={{fontSize: 12,
                            color: 'black'}}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.bio}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.actionButton, { borderColor: '#FF8400', borderWidth: 1, borderRadius: 60, padding: 10 }]}
                    onPress={() => isMember ? handleRemoveFromGroup(item.userId) : handleAddToGroup(item.userId)}
                >
                    <Text style={{ color: '#FF8400', fontWeight: 'bold',fontSize:10 }}>
                        {isMember ? 'Remove from group' : 'Add to group'}
                    </Text>
                </TouchableOpacity>
                
            </TouchableOpacity>
        );
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
                    <Image style={{width: 35, height: 35, marginRight: 10}} source={require('../../../assets/images/logo_icon.png')} />
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
                                <Image source={{ uri: group.picture }} style={styles.profilePicture} />
                                { group.author && group.author===userId && (
                <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                    <Icon name="pencil-alt" size={20} color="#fff" />
                </TouchableOpacity>
            )}
                            </TouchableOpacity>
                            
                            </View>
<View style={{flexDirection: 'row', alignItems: 'center'}}>
    <View style={{flex: 1}}/>
    {group.author && group.author === userId && (
        <View style={{backgroundColor: '#000', borderRadius: 20, padding: 5,opacity:0}}>
            <Icon name="pencil-alt" size={12} color="#fff" />
        </View>
    )}
    <View style={{width: 10}}/>
    <Text style={styles.username}>{group.name}</Text>
    <View style={{width: 10}}/>
    
    {group.author && group.author === userId && (
        <TouchableOpacity style={{backgroundColor: '#000', borderRadius: 20, padding: 5}} onPress={()=>{setGroupNameVisible(true)}}>
            <Icon name="pencil-alt" size={12} color="#fff" />
        </TouchableOpacity>
    )}
    <View style={{flex: 1}}/>
</View>

<View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20}}>
    {group.author && group.author === userId && (
        <View style={{backgroundColor: '#000', borderRadius: 20, padding: 5,opacity:0}}>
            <Icon name="pencil-alt" size={12} color="#fff" />
        </View>
    )}
    <View style={{width: 10}}/>
    <Text style={styles.bio}>{group.description}</Text>
    <View style={{width: 10}}/>
    {group.author && group.author === userId && (
        <TouchableOpacity style={{backgroundColor: '#000', borderRadius: 20, padding: 5}} onPress={()=>{setGroupDescVisible(true)}}>
            <Icon name="pencil-alt" size={12} color="#fff" />
        </TouchableOpacity>
    )}
</View>


                        
                        <Text style={styles.joinDate}>Created Date: {formatDate(group.createTime)}</Text>
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{membersCount}</Text>
                                <Text style={styles.statLabel}>Members</Text>
                            </View>
                            <View style={styles.divider}></View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{messagesCount}</Text>
                                <Text style={styles.statLabel}>Messages</Text>
                            </View>
                        </View>
                        <View style={styles.buttonsContainer}>
                 
                        <View style={styles.friendButtons}>
                            {renderButton('Members', handleMembersPress, 'users', '#FF8400')}
                            {renderButton('Message', ()=>{ navigation.popToTop();
        navigation.navigate('Chat', { groupId, name: group.name });}, 'envelope', '#FF8400')}
                        </View>
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
                                    <Image source={{ uri: group.picture }} style={styles.modalImage} />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
            <Modal
    visible={editModalVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setEditModalVisible(false)}
>
    <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={styles.editModalContainer}>
                    <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
                        <Text style={styles.modalOptionText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalOption} onPress={selectImage}>
                        <Text style={styles.modalOptionText}>Choose from Library</Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>

<Modal
    visible={isModalVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={() => {setIsModalVisible(false); setMemberModalVisible(false)}}
>
    <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={styles.editModalContainer}>
                <View style={{flexDirection:'row',}}>
                <Text style={[styles.modalTitle,{fontSize:20, marginTop:10}]}>Members</Text>
                <View style={{flex:1}}></View>
                <View style={{alignItems:'flex-end'}}>
                <Text style={[styles.modalTitle,{fontSize:15, marginTop:5}]}>Admin Count: {group.directors.length}</Text>
                <Text style={[styles.modalTitle,{fontSize:15,marginBottom:10}]}>Member Count: {members.length}</Text>
                </View>

                </View>
                <FlatList
    data={currentItems}
    keyExtractor={(item) => item.userId}
    renderItem={(props) => renderItem({ ...props, group, userId, handleMemberPress, styles })}
  />
  {members.length > itemsPerPage && (
    <View style={{marginVertical:10}}>
    <View style={[styles.pagination,{flexDirection:'row',justifyContent:'space-around',alignItems:'center'}]}>
          <Button title="Previous" onPress={handlePrevPage} disabled={currentPage === 1} color="#FF8400" style={{borderRadius: 10,}} />
          <Text>{`Page ${currentPage} of ${totalPages}`}</Text>
          <Button title="    Next    " onPress={handleNextPage} disabled={currentPage === totalPages} color="#FF8400" style={{borderRadius: 10,}} />
        </View>
    </View>
    )}
      {myDirector&&(
 <TouchableOpacity style={styles.addMemberButton} onPress={handleAddMemberPress}>
 <Text style={styles.addMemberButtonText}>Add Member</Text>
</TouchableOpacity>
      )}
    
                <Modal
    visible={memberModalVisible}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setMemberModalVisible(false)}
>
    <TouchableWithoutFeedback onPress={() => setMemberModalVisible(false)}>
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
            <TouchableWithoutFeedback>
                <View style={{
                    backgroundColor: 'white',
                    padding: 20,
                    borderRadius: 15,
                    alignItems: 'center',
                    width: '80%', // Adjust this value as needed
                }}>
                    <Image 
                        source={{ uri: selectedMember?.picture }} 
                        style={{
                            width: 100,
                            height: 100,
                            borderRadius: 50,
                            marginBottom: 15,
                        }} 
                    />
                    <Text style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        marginBottom: 5,
                    }}>
                        {selectedMember?.userName}
                    </Text>
                    <Text style={{
                        fontSize: 16,
                        color: 'gray',
                        marginBottom: 20,
                        textAlign: 'center',
                    }}>
                        {selectedMember?.bio}
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                        {renderButtons()}
                        {selectedMember?.userId !== userId && (
                            <>
                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={() => handleGoToProfile(selectedMember?.userId)}
                                >
                                    <Text style={styles.buttonText}>Go to Profile</Text>
                                </TouchableOpacity>
                               
  <TouchableOpacity 
    style={styles.button} 
    onPress={() => handleMessage(selectedMember?.userId, selectedMember?.userName, selectedMember?.conversations )}
  >
    <Text style={styles.buttonText}>Message</Text>
  </TouchableOpacity>

                            </>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>
<Modal
                                    visible={friendModalVisible}
                                    transparent={true}
                                    animationType="fade"
                                    onRequestClose={() => setFriendModalVisible(false)}
                                >
                                    <TouchableWithoutFeedback onPress={() => setFriendModalVisible(false)}>
    
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
            <TouchableWithoutFeedback>
                <View style={{
                    backgroundColor: 'white',
                    padding: 20,
                    borderRadius: 15,
                    alignItems: 'center',
                    width: '80%', // Adjust this value as needed
                    maxHeight:'60'
                }}>
                                                                    <Text style={[styles.modalTitle, { fontSize: 20, marginTop: 10,marginBottom:15 }]}>Friends</Text>
                                                <FlatList
                                                    data={friends}
                                                    keyExtractor={(item) => item.userId}
                                                    renderItem={renderFriendItem}
                                                />

                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>

                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>

{uploading && (
                <Modal transparent={true} animationType="none">
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF8400" />
                        <Text style={styles.uploadingText}>New Group Photo Uploading</Text>
                    </View>
                </Modal>
            )}
            <Modal
                                    visible={groupNameVisible}
                                    transparent={true}
                                    animationType="fade"
                                    onRequestClose={() => setGroupNameVisible(false)}
                                >
                                    <TouchableWithoutFeedback onPress={() => setGroupNameVisible(false)}>
    
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
            <TouchableWithoutFeedback>
                <View style={{
                    backgroundColor: 'white',
                    padding: 20,
                    borderRadius: 15,
                    alignItems: 'center',
                    width: '80%', // Adjust this value as needed
                    maxHeight:'60%'
                }}>
                                                                    <Text style={[styles.modalTitle, { fontSize: 20, marginTop: 10,marginBottom:15 }]}>Change Group Name</Text>
                                                                    <TextInput
                                style={{ borderRadius: 20, borderColor: '#FF8400', borderWidth: 1, width: '100%', color: '#FF8400', marginVertical: 15 }}
                                value={groupName}
                                onChangeText={setGroupName}
                            />
                                                                    <TouchableOpacity style={styles.addMemberButton} onPress={saveNewGroupName}>
 <Text style={styles.addMemberButtonText}>Save New Group Name</Text>
</TouchableOpacity>

                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>
<Modal
            visible={groupDescVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setGroupDescVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setGroupDescVisible(false)}>
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}>
                    <TouchableWithoutFeedback>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 20,
                            borderRadius: 15,
                            alignItems: 'center',
                            width: '80%',
                            maxHeight: '60%'
                        }}>
                            <Text style={[styles.modalTitle, { fontSize: 20, marginTop: 10, marginBottom:15 }]}>Change Group Description</Text>
                            <TextInput
                                style={{ borderRadius: 20, borderColor: '#FF8400', borderWidth: 1, width: '100%', color: '#FF8400', marginVertical: 15 }}
                                value={description}
                                onChangeText={setDescription}
                            />
                            <TouchableOpacity style={styles.addMemberButton} onPress={saveNewDescription}>
                                <Text style={styles.addMemberButtonText}>Save New Group Description</Text>
                            </TouchableOpacity>
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
    addMemberButton: {
        borderWidth: 1,
        backgroundColor: '#ff8400',
        borderColor:'#FF8400',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
     marginTop:10
    },
    addMemberButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    titles: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black'
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    modalTitle: {
    fontSize: 20,
},
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: Dimensions.get('window').width - 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black'
    },
    name: {
        fontSize: 14,
        color: 'black'
    },
    dot: {
        width: 13,
        height: 13,
        borderRadius: 7.5, // Yarıçap, genişlik ve yüksekliğin yarısı olmalıdır
        marginRight: 40, // İkona padding-right vermek yerine margin-right kullanıyoruz
    },
    modalOption: {
        paddingVertical: 15,
    },
    modalOptionText: {
        fontSize: 18,
        color: '#FF8400',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    uploadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    uploadingText: {
        marginTop: 10,
        fontSize: 18,
        color: '#FFF',
    },
    editModalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 10,
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
        position: 'relative', // Ensure that the parent element is positioned
      },
      profilePicture: {
        width: 200,
        height: 200,
        borderRadius: 100,
        position: 'relative', 
      },
      editButton: {
        position: 'absolute',
        bottom: 10,
        right: 15,
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 5,
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
    buttonContainer: {
        width: '100%',
    },
    button: {
        paddingVertical: 10,
        marginVertical: 5,
        backgroundColor: '#FF8400',
        borderRadius: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
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

export default GroupDetails;
