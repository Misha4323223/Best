import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageWithSender } from "@shared/schema";

export function useMessages(selectedUserId: number | null, currentUserId: number | null) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const queryClient = useQueryClient();
  
  // Query for fetching messages between current user and selected user
  const messagesQuery = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId && !!currentUserId,
  });
  
  // Update messages state when query data changes
  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data]);
  
  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedUserId || !currentUserId) {
        throw new Error("Cannot send message: Missing user IDs");
      }
      
      const res = await apiRequest("POST", "/api/messages", {
        text,
        receiverId: selectedUserId
      });
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate messages query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
    }
  });
  
  // Function to send a message
  const sendMessage = (text: string) => {
    if (text.trim() && selectedUserId) {
      sendMessageMutation.mutate(text);
    }
  };
  
  // Function to add a message directly to the state (for real-time updates)
  const addMessage = (message: MessageWithSender) => {
    setMessages(prev => [...prev, message]);
  };
  
  return {
    messages,
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage,
    addMessage
  };
}
