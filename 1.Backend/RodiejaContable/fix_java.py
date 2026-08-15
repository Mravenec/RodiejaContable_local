with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java", "r") as f:
    content = f.read()

content = content.replace('Pattern.compile("(?:IdQuotation|IdOrder|WAN)=([^&"\'>]+)")', 'Pattern.compile("(?:IdQuotation|IdOrder|WAN)=([^&\\"\\'>]+)")')
content = content.replace('Pattern.compile("[\'"]([A-Za-z0-9+/]{10,60}=*)[\'"]')', 'Pattern.compile("[\\\'\\"]([A-Za-z0-9+/]{10,60}=*)[\\\'\\"]")')

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java", "w") as f:
    f.write(content)

