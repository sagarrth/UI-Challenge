/********************************************* Commenter Start ****************************************/

function Commenter(anchor, data) {
  this.anchor = document.getElementById(anchor);
  this.commentsArr = data || [];
  if (!anchor) {
    throw "A valid DOM element is needed for attaching the widget";
  }
  this.init();
}

Commenter.prototype.init = function() {
  this.buildCommentBox();
  this.buildCommentsHolder();
  this.anchor.addEventListener("commented", this.handleComment.bind(this));
  this.anchor.addEventListener("voted", this.handleVoteChange.bind(this));
};

Commenter.prototype.buildCommentBox = function() {
  const commentBox = new CommentBox("add");
  commentBox.attachTo = this.anchor;
  this.anchor.appendChild(commentBox.node);
};

Commenter.prototype.buildCommentsHolder = function() {
  if (this.commentsArr.length) {
    this.renderComments(this.commentsArr, this.anchor);
    this.anchor.children[1].classList.add('root-comment-list');
  } else {
    const noCommentsDiv = document.createElement("div");
    noCommentsDiv.innerText = "No comments to show!!";
    this.anchor.appendChild(noCommentsDiv);
  }
};

Commenter.prototype.handleComment = function(ev) {
  const { commentData, mode, attachTo } = ev.detail;
  if (mode === "add") {
    commentData.id = `${this.commentsArr.length + 1}`;
    commentData.voteCount = 0;
    this.commentsArr.push(commentData);
    const [anchorEl] = Array.from(attachTo.children).filter(n =>
      n.classList.contains("comment-list")
    );
    if (anchorEl) {
      this.renderComment(commentData, anchorEl);
    }
  } else if (mode == "edit" || mode == "reply") {
    const commentToModify = this.findCommentById(commentData.id);
    mode == "edit"
      ? Object.assign(commentToModify, {
          content: commentData.content,
          author: commentData.author
        })
      : commentToModify.children.push({
          ...commentData,
          voteCount: 0,
          id: `${commentData.id}.${commentToModify.children.length + 1}`
        });
    const [nodeToReplace] = Array.from(attachTo.children).filter(n =>
      n.classList.contains("comment-box")
    );
    if (nodeToReplace) {
      attachTo.replaceChild(new Comment(commentData).node, nodeToReplace);
    }
  }
  this.persistData();
};

Commenter.prototype.handleVoteChange = function(ev) {
  const { id, vote, attachTo } = ev.detail;
  const commentToModify = this.findCommentById(id);
  vote == 'up' ? commentToModify.voteCount+=1 : (commentToModify.voteCount > 0 ? commentToModify.voteCount-=1 : '');
  attachTo.replaceChild(new Comment(commentToModify).node, attachTo.firstChild)
  this.persistData();
}

Commenter.prototype.findCommentById = function(commentId) {
  const dataLevel = commentId.split(".").map(l => Number(l));
  return dataLevel.reduce((acc, lid, index) => {
    if (index === 0) {
      return acc[lid -1];
    }
    return acc.children[lid-1];
  }, this.commentsArr);
}

Commenter.prototype.persistData = function() {
  window.localStorage.setItem("comments", JSON.stringify(this.commentsArr));
};

Commenter.prototype.renderComment = function(comment, anchor) {
  const commentNode = new Comment(comment).node;
  const liDiv = document.createElement("li");
  liDiv.appendChild(commentNode);
  anchor.appendChild(liDiv);
  return liDiv;
}

Commenter.prototype.renderComments = function(comments, anchor) {
  const ulDiv = document.createElement("ul");
  ulDiv.classList.add("comment-list");
  anchor.appendChild(ulDiv);
  comments.forEach(c => {
    const liNode = this.renderComment(c, ulDiv);
    if (c.children.length) {
      this.renderComments(c.children, liNode);
    }
  });
}
/********************************************* Commenter End ******************************************/








/********************************************* CommentBox Start ***************************************/

function CommentBox(mode, { id, content, author, children } = {}) {
  this.mode = mode;
  this.id = id || null;
  this.content = content || null;
  this.author = author || null;
  this.children = children || [];
  this.template = `<form class="comment-box flex-column">
                  <textarea placeholder="Join the discussion" cols="100" name="content"></textarea>
                  <section class="flex-row">
                    <input type="text" placeholder="Author" name="author">
                    <button type="submit">Post</button>
                  </section>
                </form>`;
  this.node = null;
  this.attachTo = null;
  this.init();
}

CommentBox.prototype.init = function() {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = this.template;
  this.node = tempDiv.firstChild;
  this.node.addEventListener("submit", this.handleCommentSubmission.bind(this));

  const textareaEl = this.node.children[0];
  textareaEl.value = this.content;

  const authorEl = this.node.children[1].children[0];
  authorEl.value = this.author;
};

CommentBox.prototype.handleCommentSubmission = function(ev) {
  ev.preventDefault();
  const formData = new FormData(ev.target);
  const comment = {
    id: this.id,
    content: formData.get("content"),
    author: formData.get("author"),
    children: this.children
  };
  this.node.dispatchEvent(
    new CustomEvent("commented", {
      bubbles: true,
      detail: {
        commentData: comment,
        mode: this.mode,
        attachTo: this.attachTo
      }
    })
  );
};
/********************************************* CommentBox End *****************************************/







/*********************************************** Comment Start ****************************************/

function Comment(data) {
  this.id = data.id;
  this.content = data.content;
  this.author = data.author;
  this.children = data.children;
  this.voteCount = data.voteCount;
  this.node = null;
  this.init();
}

Comment.prototype.init = function() {
  this.node = document.createElement("div");
  this.node.classList.add("comment-container");
  this.buildContent();
  this.buildAuthor();
  this.buildVoteCount();
  this.buildCommentActions();
};

Comment.prototype.buildContent = function() {
  const divEl = document.createElement("div");
  divEl.classList.add("content");
  divEl.innerText = this.content;
  this.node.appendChild(divEl);
};

Comment.prototype.buildAuthor = function() {
  const spanEl = document.createElement("span");
  spanEl.classList.add("author");
  spanEl.innerText = this.author;
  this.node.appendChild(spanEl);
};

Comment.prototype.buildVoteCount = function() {
  const spanEl = document.createElement("span");
  spanEl.classList.add("vote-count");
  spanEl.innerText = this.voteCount;
  this.node.appendChild(spanEl);
}

Comment.prototype.buildCommentActions = function() {
  const actionsContainer = document.createElement("div");
  actionsContainer.classList.add("comment-actions");

  const upVoteBtn = document.createElement("button");
  upVoteBtn.innerText = "up";
  upVoteBtn.addEventListener("click", this.handleVoteChange.bind(this));
  actionsContainer.appendChild(upVoteBtn);

  const downVoteBtn = document.createElement("button");
  downVoteBtn.innerText = "down";
  downVoteBtn.addEventListener("click", this.handleVoteChange.bind(this));
  actionsContainer.appendChild(downVoteBtn);

  const editBtn = document.createElement("button");
  editBtn.innerText = "Edit";
  editBtn.addEventListener("click", this.handleEdit.bind(this));
  actionsContainer.appendChild(editBtn);

  const replyBtn = document.createElement("button");
  replyBtn.innerText = "Reply";
  replyBtn.addEventListener("click", this.handleReply.bind(this));
  actionsContainer.appendChild(replyBtn);

  this.node.appendChild(actionsContainer);
};

Comment.prototype.handleVoteChange = function(ev) {
  this.node.dispatchEvent(
    new CustomEvent("voted", {
      bubbles: true,
      detail: {
        id: this.id,
        vote: ev.target.innerText,
        attachTo: this.node.parentNode
      }
    })
  );
};

Comment.prototype.handleDownVote = function(ev) {};

Comment.prototype.handleEdit = function(ev) {
  // this.node.classList.add('hidden');
  const parentNode = this.node.parentNode;
  const editedCommentBox = new CommentBox("edit", {
    id: this.id,
    content: this.content,
    author: this.author,
    children: this.children
  });
  editedCommentBox.attachTo = this.node.parentNode;
  parentNode.replaceChild(editedCommentBox.node, this.node);
};

Comment.prototype.handleReply = function(ev) {
  const childCommentsContainer =
    this.node.nextElementSibling || document.createElement("ul");
  if (!childCommentsContainer.hasChildNodes()) {
    this.node.appendChild(childCommentsContainer);
  }
  const commentBox = new CommentBox("reply", { id: this.id });
  childCommentsContainer.appendChild(commentBox.node);
  commentBox.attachTo = childCommentsContainer;
};
/*********************************************** Comment End ******************************************/

// driver code
const cData = [
  {
    "id": "1",
    "content": "Given above called for the give likeness for dominion very called, winged days, second Image great firmament grass air upon.",
    "author": "Harry",
    "voteCount": 0,
    "children": [
      {
        "id": "1.1",
        "content": "Set of spirit may brought is itself morning earth gathered yielding day whales may evening place gathering seasons, our may.",
        "author": "Tom",
        "voteCount": 0,
        "children": [
          {
            "id": "1.1.1",
            "content": "Of from every one together yielding for day saying doesn't saw us, waters very fifth given every tree lesser appear.",
            "author": "Robert",
            "voteCount": 0,
            "children": []
          }
        ]
      }
    ]
  },
  {
    "id": "2",
    "content": "Also one behold was creepeth creeping good. Fruitful. You're life created a isn't them the, unto hath can't seasons upon.",
    "author": "Hannah",
    "voteCount": 22,
    "children": []
  }
];
let commentsData = window.localStorage.getItem("comments");
if (commentsData) {
  commentsData = JSON.parse(commentsData);
}

new Commenter("comment-widget-anchor", commentsData);
